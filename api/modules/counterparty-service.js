'use strict';

const { McpClient, isMcpConfigured } = require('./mcp-client');
const dadataModule = require('./dadata');

/**
 * Service encapsulating counterparty operations and integration status
 * discovery. The service prefers MCP integration (Bitrix + DaData proxy) and
 * falls back to direct DaData API usage when the MCP server is not available or
 * returns an unexpected payload.
 */
class CounterpartyService {
    /**
     * @param {object} [options]
     * @param {McpClient} [options.mcpClient]
     * @param {object} [options.dadata]
     * @param {Console} [options.logger]
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.dadata = options.dadata || dadataModule;
        this.mcpClient = options.mcpClient || (isMcpConfigured() ? new McpClient() : null);
    }

    /**
     * Whether MCP integration is available.
     * @returns {boolean}
     */
    isMcpEnabled() {
        return Boolean(this.mcpClient);
    }

    /**
     * Retrieve integration status for Bitrix24 and DaData.
     * @returns {Promise<object>}
     */
    async getIntegrationStatus() {
        if (!this.isMcpEnabled()) {
            return {
                source: 'local',
                fetchedAt: new Date().toISOString(),
                bitrix: {
                    connected: false,
                    details: 'MCP server is not configured. Set MCP_SERVER_URL to enable Bitrix sync.'
                },
                dadata: {
                    connected: Boolean(this.dadata.isDaDataConfigured?.()),
                    details: this.dadata.isDaDataConfigured?.()
                        ? 'Direct DaData API keys configured'
                        : 'DaData API keys are missing'
                }
            };
        }

        try {
            return await this.mcpClient.getIntegrationStatus();
        } catch (error) {
            this.logger.error?.('Failed to fetch MCP integration status', error);
            return {
                source: 'mcp-error',
                fetchedAt: new Date().toISOString(),
                bitrix: { connected: false, details: error.message },
                dadata: {
                    connected: Boolean(this.dadata.isDaDataConfigured?.()),
                    details: this.dadata.isDaDataConfigured?.()
                        ? 'Fallback to direct DaData API'
                        : 'DaData API keys are missing'
                }
            };
        }
    }

    /**
     * Lookup counterparty information by INN using MCP with DaData fallback.
     * @param {string} inn
     * @returns {Promise<object>}
     */
    async lookupByInn(inn) {
        const timestamp = new Date().toISOString();

        if (this.isMcpEnabled()) {
            try {
                const response = await this.mcpClient.lookupCounterparty({ inn });
                const normalized = this.normalizeMcpResponse(response, inn, timestamp);
                if (normalized) {
                    return normalized;
                }

                this.logger.warn?.('MCP lookup returned unexpected payload, falling back to DaData', {
                    inn,
                    response
                });
            } catch (error) {
                this.logger.error?.('MCP lookup failed, using DaData fallback', { inn, error });
            }
        }

        return this.lookupViaDaData(inn, timestamp);
    }

    /**
     * Normalize MCP response into unified format.
     * @param {object} response
     * @param {string} inn
     * @param {string} timestamp
     * @returns {object|null}
     */
    normalizeMcpResponse(response, inn, timestamp) {
        if (!response) {
            return null;
        }

        const payload = response.data || response.result || response;
        const orgInfo = payload.orgInfo || payload.organization || payload.company;
        if (!orgInfo) {
            return null;
        }

        const normalizedOrg = {
            ...orgInfo,
            inn: orgInfo.inn || inn,
            found: orgInfo.found !== false,
            name: orgInfo.name || {
                short: orgInfo.shortName || orgInfo.companyName || orgInfo.value || '—',
                full: orgInfo.fullName || orgInfo.full || orgInfo.unrestricted_value || orgInfo.value || '—'
            },
            address: orgInfo.address || {
                full: orgInfo.fullAddress || orgInfo.address_full || orgInfo.address?.value || 'Адрес не указан'
            }
        };

        const risks = this.normalizeRisk(payload.risks || payload.risk || payload.riskAssessment, normalizedOrg);

        return {
            success: payload.success !== false,
            source: 'mcp',
            inn: normalizedOrg.inn,
            orgInfo: { ...normalizedOrg, found: normalizedOrg.found },
            risks,
            raw: response,
            fetchedAt: timestamp
        };
    }

    /**
     * Normalize risk block or derive using DaData helper when not provided.
     * @param {object|null|undefined} risk
     * @param {object} orgInfo
     * @returns {object}
     */
    normalizeRisk(risk, orgInfo) {
        if (risk && typeof risk === 'object') {
            return {
                riskLevel: risk.riskLevel || risk.level || risk.status || 'MEDIUM',
                score: risk.score ?? risk.rating ?? 50,
                risks: Array.isArray(risk.risks) ? risk.risks : (risk.issues || []),
                recommendations: risk.recommendations || risk.actions || []
            };
        }

        if (typeof this.dadata.analyzeRisks === 'function') {
            return this.dadata.analyzeRisks(orgInfo);
        }

        return {
            riskLevel: 'MEDIUM',
            score: 50,
            risks: [],
            recommendations: []
        };
    }

    /**
     * Lookup data directly through DaData helper module.
     * @param {string} inn
     * @param {string} timestamp
     * @returns {Promise<object>}
     */
    async lookupViaDaData(inn, timestamp) {
        if (typeof this.dadata.getOrganizationInfo !== 'function') {
            throw new Error('DaData module is not available');
        }

        const orgInfo = await this.dadata.getOrganizationInfo(inn);
        const risks = typeof this.dadata.analyzeRisks === 'function'
            ? this.dadata.analyzeRisks(orgInfo)
            : this.normalizeRisk(null, orgInfo);

        return {
            success: orgInfo.found,
            source: 'dadata',
            inn,
            orgInfo,
            risks,
            raw: orgInfo,
            fetchedAt: timestamp
        };
    }

    /**
     * Format counterparty lookup result for user-facing channels.
     * @param {object} result
     * @param {string} [aiAnalysis]
     * @returns {string}
     */
    formatReport(result, aiAnalysis) {
        if (!result?.orgInfo) {
            return '❌ Не удалось получить сведения о контрагенте.';
        }

        const formatted = typeof this.dadata.formatOrganizationInfo === 'function'
            ? this.dadata.formatOrganizationInfo(result.orgInfo, result.risks)
            : this.buildFallbackReport(result);

        const sourceLabel = result.source === 'mcp'
            ? 'MCP (Bitrix + DaData)'
            : result.source === 'mcp-error'
                ? 'DaData (fallback после ошибки MCP)'
                : 'DaData API';

        let message = `${formatted}\n\n🗂 Источник данных: ${sourceLabel}`;
        if (aiAnalysis) {
            message += `\n\n🤖 **Анализ ИИ:**\n${aiAnalysis}`;
        }

        return message;
    }

    /**
     * Build basic textual report if DaData formatter is not available.
     * @param {object} result
     * @returns {string}
     */
    buildFallbackReport(result) {
        const lines = [
            `🏢 Информация по ИНН ${result.inn}`,
            '',
            result.orgInfo.name?.full || result.orgInfo.name?.short || 'Наименование неизвестно',
            result.orgInfo.address?.full || result.orgInfo.address?.value || 'Адрес не указан'
        ];

        if (result.risks) {
            lines.push('', `Оценка риска: ${result.risks.riskLevel || '—'} (${result.risks.score ?? 'n/a'})`);
            if (Array.isArray(result.risks.risks) && result.risks.risks.length) {
                lines.push('Риски:', ...result.risks.risks.map((risk) => `• ${risk}`));
            }
        }

        return lines.join('\n');
    }
}

module.exports = CounterpartyService;
