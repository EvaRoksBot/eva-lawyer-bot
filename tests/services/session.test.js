jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
});

const Redis = require('ioredis');
const {
  getUserSession,
  saveUserSession,
  deleteUserSession,
} = require('../../src/services/session');

describe('Session Service', () => {
  it('should return empty object when session not found', async () => {
    const result = await getUserSession(1);
    expect(result).toEqual({});
  });

  it('should save user session', async () => {
    const success = await saveUserSession(1, { foo: 'bar' });
    expect(success).toBe(true);
    const client = Redis.mock.results[0].value;
    expect(client.setex).toHaveBeenCalled();
  });

  it('should delete user session', async () => {
    const success = await deleteUserSession(1);
    expect(success).toBe(true);
    const client = Redis.mock.results[0].value;
    expect(client.del).toHaveBeenCalledWith('user:1');
  });

  it('should handle redis errors gracefully', async () => {
    const client = Redis.mock.results[0].value;
    client.get.mockRejectedValueOnce(new Error('fail'));
    client.setex.mockRejectedValueOnce(new Error('fail'));
    client.del.mockRejectedValueOnce(new Error('fail'));

    const getRes = await getUserSession(2);
    expect(getRes).toEqual({});

    const saveRes = await saveUserSession(2, {});
    expect(saveRes).toBe(false);

    const delRes = await deleteUserSession(2);
    expect(delRes).toBe(false);
  });
});
