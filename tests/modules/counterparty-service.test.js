const CounterpartyService = require('../../api/modules/counterparty-service');

describe('CounterpartyService', () => {
  const baseOrg = {
    inn: '7707083893',
    name: { full: 'ООО «Ромашка»', short: 'ООО «Ромашка»' },
    address: { full: 'г. Москва' },
    status: { value: 'ACTIVE', date: '2020-01-01T00:00:00Z' },
    management: { name: 'Иванов И.И.', post: 'Директор' }
  };

  const loggerStub = {
    error: jest.fn(),
    warn: jest.fn()
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prefers MCP result when available', async () => {
    const mcpStub = {
      lookupCounterparty: jest.fn().mockResolvedValue({
        data: {
          orgInfo: baseOrg,
          risks: { riskLevel: 'LOW', score: 90, risks: [], recommendations: [] },
          success: true
        }
      })
    };

    const service = new CounterpartyService({
      mcpClient: mcpStub,
      dadata: {
        analyzeRisks: jest.fn(),
        formatOrganizationInfo: jest.fn(() => 'formatted')
      },
      logger: loggerStub
    });

    const result = await service.lookupByInn('7707083893');

    expect(mcpStub.lookupCounterparty).toHaveBeenCalledWith({ inn: '7707083893' });
    expect(result.source).toBe('mcp');
    expect(result.orgInfo.name.full).toBe('ООО «Ромашка»');
  });

  it('falls back to DaData when MCP payload is invalid', async () => {
    const mcpStub = {
      lookupCounterparty: jest.fn().mockResolvedValue({ data: { success: true } })
    };

    const dadataStub = {
      getOrganizationInfo: jest.fn().mockResolvedValue({ ...baseOrg, found: true }),
      analyzeRisks: jest.fn().mockReturnValue({ riskLevel: 'MEDIUM', score: 60, risks: [], recommendations: [] }),
      formatOrganizationInfo: jest.fn(() => 'formatted')
    };

    const service = new CounterpartyService({
      mcpClient: mcpStub,
      dadata: dadataStub,
      logger: loggerStub
    });

    const result = await service.lookupByInn('7707083893');

    expect(dadataStub.getOrganizationInfo).toHaveBeenCalledWith('7707083893');
    expect(result.source).toBe('dadata');
    expect(loggerStub.warn).toHaveBeenCalled();
  });

  it('handles MCP lookup failures gracefully', async () => {
    const mcpStub = {
      lookupCounterparty: jest.fn().mockRejectedValue(new Error('network'))
    };

    const dadataStub = {
      getOrganizationInfo: jest.fn().mockResolvedValue({ ...baseOrg, found: true }),
      analyzeRisks: jest.fn().mockReturnValue({ riskLevel: 'LOW', score: 80, risks: [], recommendations: [] }),
      formatOrganizationInfo: jest.fn(() => 'formatted')
    };

    const service = new CounterpartyService({
      mcpClient: mcpStub,
      dadata: dadataStub,
      logger: loggerStub
    });

    const result = await service.lookupByInn('7707083893');

    expect(loggerStub.error).toHaveBeenCalled();
    expect(result.source).toBe('dadata');
  });

  it('falls back when MCP returns empty response', async () => {
    const mcpStub = {
      lookupCounterparty: jest.fn().mockResolvedValue(null)
    };

    const dadataStub = {
      getOrganizationInfo: jest.fn().mockResolvedValue({ ...baseOrg, found: true }),
      analyzeRisks: jest.fn().mockReturnValue({ riskLevel: 'LOW', score: 90, risks: [], recommendations: [] }),
      formatOrganizationInfo: jest.fn(() => 'formatted')
    };

    const service = new CounterpartyService({ mcpClient: mcpStub, dadata: dadataStub, logger: loggerStub });
    const result = await service.lookupByInn('7707083893');

    expect(loggerStub.warn).toHaveBeenCalled();
    expect(result.source).toBe('dadata');
  });

  it('formats report with AI analysis', () => {
    const dadataStub = {
      formatOrganizationInfo: jest.fn(() => 'formatted text')
    };

    const service = new CounterpartyService({ dadata: dadataStub, logger: loggerStub });
    const message = service.formatReport({
      source: 'mcp',
      inn: '7707083893',
      orgInfo: baseOrg,
      risks: { riskLevel: 'HIGH', score: 40, risks: ['Риск'], recommendations: [] }
    }, 'AI report');

    expect(message).toContain('formatted text');
    expect(message).toContain('AI report');
    expect(dadataStub.formatOrganizationInfo).toHaveBeenCalled();
  });

  it('provides local integration status when MCP is disabled', async () => {
    const dadataStub = {
      isDaDataConfigured: jest.fn().mockReturnValue(true)
    };

    const service = new CounterpartyService({ dadata: dadataStub, logger: loggerStub, mcpClient: null });
    const status = await service.getIntegrationStatus();

    expect(status.source).toBe('local');
    expect(status.bitrix.connected).toBe(false);
    expect(status.dadata.connected).toBe(true);
  });

  it('handles MCP status fetch errors', async () => {
    const service = new CounterpartyService({
      mcpClient: { getIntegrationStatus: jest.fn().mockRejectedValue(new Error('fail')) },
      dadata: { isDaDataConfigured: jest.fn().mockReturnValue(false) },
      logger: loggerStub
    });

    const status = await service.getIntegrationStatus();
    expect(status.source).toBe('mcp-error');
    expect(status.dadata.details).toBe('DaData API keys are missing');
  });

  it('uses default risk calculation when analyzeRisks is missing', async () => {
    const dadataStub = {
      getOrganizationInfo: jest.fn().mockResolvedValue({ ...baseOrg, found: true })
    };

    const service = new CounterpartyService({ dadata: dadataStub, logger: loggerStub, mcpClient: null });
    const result = await service.lookupByInn('7707083893');

    expect(result.risks.score).toBe(50);
    expect(result.risks.riskLevel).toBe('MEDIUM');
  });

  it('uses provided analyzeRisks implementation when available', async () => {
    const dadataStub = {
      getOrganizationInfo: jest.fn().mockResolvedValue({ ...baseOrg, found: true }),
      analyzeRisks: jest.fn().mockReturnValue({ riskLevel: 'CRITICAL', score: 5, risks: ['Риск'], recommendations: [] }),
      formatOrganizationInfo: jest.fn(() => 'formatted')
    };

    const service = new CounterpartyService({ dadata: dadataStub, logger: loggerStub, mcpClient: null });
    const result = await service.lookupByInn('7707083893');

    expect(dadataStub.analyzeRisks).toHaveBeenCalled();
    expect(result.risks.score).toBe(5);
    expect(result.risks.riskLevel).toBe('CRITICAL');
  });

  it('normalizes risk through external helper when invoked directly', () => {
    const analyzeMock = jest.fn().mockReturnValue({ riskLevel: 'LOW', score: 88, risks: [], recommendations: [] });
    const service = new CounterpartyService({ dadata: { analyzeRisks: analyzeMock }, logger: loggerStub, mcpClient: null });
    const result = service.normalizeRisk(null, baseOrg);

    expect(analyzeMock).toHaveBeenCalled();
    expect(result.score).toBe(88);
  });

  it('returns MCP integration status when available', async () => {
    const statusPayload = {
      bitrix: { connected: true, lastSync: '2024-01-01T00:00:00Z' },
      dadata: { connected: true, balance: 42 },
      source: 'mcp',
      fetchedAt: '2024-01-01T00:00:00Z'
    };

    const service = new CounterpartyService({
      mcpClient: { getIntegrationStatus: jest.fn().mockResolvedValue(statusPayload) },
      dadata: { isDaDataConfigured: jest.fn() },
      logger: loggerStub
    });

    const status = await service.getIntegrationStatus();
    expect(status.bitrix.connected).toBe(true);
    expect(status.dadata.balance).toBe(42);
    expect(status.source).toBe('mcp');
  });

  it('builds fallback report when formatter is absent', () => {
    const service = new CounterpartyService({ dadata: {}, logger: loggerStub, mcpClient: null });
    const message = service.formatReport({
      source: 'dadata',
      inn: '7707083893',
      orgInfo: baseOrg,
      risks: { riskLevel: 'LOW', score: 85, risks: ['Риск 1'], recommendations: [] }
    });

    expect(message).toContain('Информация по ИНН');
    expect(message).toContain('Оценка риска');
    expect(message).toContain('• Риск 1');
  });

  it('throws when DaData module is missing required methods', async () => {
    const service = new CounterpartyService({ dadata: {}, logger: loggerStub, mcpClient: null });
    await expect(service.lookupByInn('7707083893')).rejects.toThrow('DaData module is not available');
  });

  it('returns error message when report lacks organization info', () => {
    const service = new CounterpartyService({ dadata: {}, logger: loggerStub, mcpClient: null });
    const message = service.formatReport({ source: 'mcp' });
    expect(message).toContain('❌');
  });
});
