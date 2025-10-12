'use strict';

/**
 * MCP integration client responsible for communicating with the centralized
 * middleware service that proxies Bitrix24 and DaData operations.
 * The client uses axios under the hood and exposes a small set of helper
 * methods required by the bot. All methods return normalized objects that can
 * be safely consumed by higher level modules without leaking transport
 * specifics.
 */

const axios = require('axios');

const DEFAULT_ENDPOINTS = {
    bitrixStatus: '/integrations/bitrix/status',
    bitrixSync: '/integrations/bitrix/sync',
    dadataStatus: '/integrations/dadata/status',
    dadataLookup: '/integrations/dadata/lookup'
};

const ENV_ENDPOINT_MAPPING = {
    bitrixStatus: 'MCP_ENDPOINT_BITRIX_STATUS',
    bitrixSync: 'MCP_ENDPOINT_BITRIX_SYNC',
    dadataStatus: 'MCP_ENDPOINT_DADATA_STATUS',
    dadataLookup: 'MCP_ENDPOINT_DADATA_LOOKUP'
};

function resolveEnvEndpoints() {
    return Object.fromEntries(
        Object.entries(ENV_ENDPOINT_MAPPING)
            .map(([key, envKey]) => [key, process.env[envKey]])
            .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    );
}

/**
 * Check whether MCP integration is configured through environment variables.
 * @returns {boolean}
 */
function isMcpConfigured() {
    return Boolean(process.env.MCP_SERVER_URL);
}

class McpClient {
    /**
     * @param {object} [options]
     * @param {string} [options.baseURL]
     * @param {string} [options.apiKey]
     * @param {number} [options.timeout]
     * @param {object} [options.endpoints]
     */
    constructor(options = {}) {
        const baseURL = options.baseURL || process.env.MCP_SERVER_URL;
        if (!baseURL) {
            throw new Error('MCP server URL is not configured. Set MCP_SERVER_URL env variable.');
        }

        this.endpoints = {
            ...DEFAULT_ENDPOINTS,
            ...resolveEnvEndpoints(),
            ...(options.endpoints || {})
        };
        this.http = axios.create({
            baseURL,
            timeout: Number(options.timeout || process.env.MCP_TIMEOUT || 10000),
            headers: this.buildHeaders(options.apiKey || process.env.MCP_API_KEY)
        });
    }

    /**
     * Build request headers taking into account optional API key.
     * @param {string|undefined} apiKey
     * @returns {object}
     */
    buildHeaders(apiKey) {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }
        return headers;
    }

    /**
     * Generic request helper with unified error handling.
     * @param {string} method
     * @param {string} url
     * @param {object} [data]
     * @returns {Promise<object>}
     */
    async request(method, url, data) {
        try {
            const response = await this.http.request({ method, url, data });
            return response.data;
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    /**
     * Normalize axios errors to readable messages.
     * @param {Error} error
     * @returns {Error}
     */
    normalizeError(error) {
        if (error.response) {
            const err = new Error(
                `MCP request failed with status ${error.response.status}: ${error.response.statusText}`
            );
            err.status = error.response.status;
            err.data = error.response.data;
            return err;
        }

        if (error.request) {
            const err = new Error('MCP request failed: no response received');
            err.cause = error;
            return err;
        }

        return error;
    }

    /**
     * Fetch Bitrix24 integration status from MCP server.
     * @returns {Promise<object>}
     */
    async getBitrixStatus() {
        const data = await this.request('GET', this.endpoints.bitrixStatus);
        return {
            connected: Boolean(data?.connected ?? data?.success ?? data?.status === 'ok'),
            details: data?.details || data?.message || null,
            lastSync: data?.lastSync || data?.last_synced_at || null,
            raw: data
        };
    }

    /**
     * Fetch DaData integration status.
     * @returns {Promise<object>}
     */
    async getDaDataStatus() {
        const data = await this.request('GET', this.endpoints.dadataStatus);
        return {
            connected: Boolean(data?.connected ?? data?.success ?? data?.status === 'ok'),
            balance: data?.balance ?? data?.daily_limit ?? null,
            lastSuccess: data?.lastSuccess || data?.last_success_at || null,
            raw: data
        };
    }

    /**
     * Combined helper returning both integration statuses.
     * @returns {Promise<object>}
     */
    async getIntegrationStatus() {
        const [bitrix, dadata] = await Promise.allSettled([
            this.getBitrixStatus(),
            this.getDaDataStatus()
        ]);

        return {
            bitrix: bitrix.status === 'fulfilled'
                ? bitrix.value
                : { connected: false, details: bitrix.reason?.message || 'Status unavailable' },
            dadata: dadata.status === 'fulfilled'
                ? dadata.value
                : { connected: false, details: dadata.reason?.message || 'Status unavailable' },
            source: 'mcp',
            fetchedAt: new Date().toISOString()
        };
    }

    /**
     * Trigger Bitrix synchronization for a lead/contact payload.
     * @param {object} payload
     * @returns {Promise<object>}
     */
    async syncBitrix(payload) {
        return this.request('POST', this.endpoints.bitrixSync, payload);
    }

    /**
     * Perform counterparty lookup using DaData proxy on MCP server.
     * @param {object} payload
     * @param {string} payload.inn
     * @param {string} [payload.query]
     * @returns {Promise<object>}
     */
    async lookupCounterparty(payload) {
        return this.request('POST', this.endpoints.dadataLookup, payload);
    }
}

module.exports = {
    McpClient,
    isMcpConfigured
};
