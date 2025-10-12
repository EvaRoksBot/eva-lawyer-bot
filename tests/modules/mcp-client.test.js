jest.mock('axios', () => ({
  create: jest.fn()
}));

const axios = require('axios');
const { McpClient, isMcpConfigured } = require('../../api/modules/mcp-client');

describe('McpClient', () => {
  const originalEnv = { ...process.env };
  let requestMock;

  beforeEach(() => {
    process.env = { ...originalEnv, MCP_SERVER_URL: 'https://mcp.example.com', MCP_API_KEY: 'token' };
    requestMock = jest.fn();
    axios.create.mockReturnValue({ request: requestMock });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('detects configuration using environment variables', () => {
    expect(isMcpConfigured()).toBe(true);
    delete process.env.MCP_SERVER_URL;
    expect(isMcpConfigured()).toBe(false);
  });

  it('throws if MCP URL is missing', () => {
    delete process.env.MCP_SERVER_URL;
    expect(() => new McpClient()).toThrow('MCP server URL is not configured');
  });

  it('fetches and normalizes integration status', async () => {
    requestMock
      .mockResolvedValueOnce({ data: { connected: true, lastSync: '2024-01-01T00:00:00Z' } })
      .mockResolvedValueOnce({ data: { connected: false, details: 'quota exceeded' } });

    const client = new McpClient();
    const status = await client.getIntegrationStatus();

    expect(requestMock).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      url: '/integrations/bitrix/status',
      data: undefined
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: '/integrations/dadata/status',
      data: undefined
    });

    expect(status.bitrix.connected).toBe(true);
    expect(status.bitrix.lastSync).toBe('2024-01-01T00:00:00Z');
    expect(status.dadata.connected).toBe(false);
    expect(status.dadata.raw.details).toBe('quota exceeded');
    expect(status.source).toBe('mcp');
  });

  it('allows overriding endpoints via environment variables', async () => {
    process.env.MCP_ENDPOINT_BITRIX_STATUS = '/bitrix/custom/status';
    process.env.MCP_ENDPOINT_DADATA_STATUS = '/dadata/custom/status';
    process.env.MCP_ENDPOINT_DADATA_LOOKUP = '/dadata/custom/lookup';
    process.env.MCP_ENDPOINT_BITRIX_SYNC = '/bitrix/custom/sync';

    requestMock
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });

    const client = new McpClient();
    await client.getIntegrationStatus();
    await client.lookupCounterparty({ inn: '123' });
    await client.syncBitrix({});

    expect(requestMock).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      url: '/bitrix/custom/status',
      data: undefined
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: '/dadata/custom/status',
      data: undefined
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, {
      method: 'POST',
      url: '/dadata/custom/lookup',
      data: { inn: '123' }
    });
    expect(requestMock).toHaveBeenNthCalledWith(4, {
      method: 'POST',
      url: '/bitrix/custom/sync',
      data: {}
    });
  });

  it('delegates counterparty lookup', async () => {
    const payload = { inn: '7707083893' };
    requestMock.mockResolvedValueOnce({ data: { success: true, company: {} } });

    const client = new McpClient();
    const result = await client.lookupCounterparty(payload);

    expect(requestMock).toHaveBeenCalledWith({
      method: 'POST',
      url: '/integrations/dadata/lookup',
      data: payload
    });
    expect(result).toEqual({ success: true, company: {} });
  });
  it('normalizes axios response errors', async () => {
    requestMock
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockRejectedValueOnce({
        response: { status: 500, statusText: 'Internal Server Error', data: { message: 'boom' } }
      });

    const client = new McpClient();
    const status = await client.getIntegrationStatus();

    expect(status.dadata.connected).toBe(false);
    expect(status.dadata.details).toBe('MCP request failed with status 500: Internal Server Error');
  });

  it('handles network errors without response payload', async () => {
    requestMock
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockRejectedValueOnce({ request: {} });

    const client = new McpClient();
    const status = await client.getIntegrationStatus();

    expect(status.dadata.connected).toBe(false);
    expect(status.dadata.details).toBe('MCP request failed: no response received');
  });

  it('surfaces unexpected errors from axios', async () => {
    requestMock
      .mockResolvedValueOnce({ data: { connected: true } })
      .mockRejectedValueOnce(new Error('boom'));

    const client = new McpClient();
    const status = await client.getIntegrationStatus();

    expect(status.dadata.connected).toBe(false);
    expect(status.dadata.details).toBe('boom');
  });
});
