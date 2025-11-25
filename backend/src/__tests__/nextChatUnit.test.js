import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';

const mockIO = {
  to: jest.fn(),
  emit: jest.fn(),
};
mockIO.to.mockReturnThis();

const mockChatSession = {
  findOne: jest.fn(),
};

const mockQueue = {
  findOneAndUpdate: jest.fn(),
};

// Define variable for the function to be tested
let nextChat;

const ChatSession = mockChatSession;
const Queue = mockQueue;

describe('Chat Controller - Next Chat Unit Tests', () => {
  let req;
  let res;
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockPartnerId = '507f1f77bcf86cd799439012';
  const mockSessionId = '507f1f77bcf86cd799439013';

  beforeAll(async () => {
    jest.unstable_mockModule('../server.js', () => ({
      io: mockIO,
    }));

    jest.unstable_mockModule('../models/ChatSession.js', () => ({
      default: mockChatSession,
    }));

    jest.unstable_mockModule('../models/Queue.js', () => ({
      default: mockQueue,
    }));

    jest.unstable_mockModule('../routes/chatRoutes.js', () => ({
      default: {},
    }));

    const chatController = await import('../controllers/chatController.js');
    nextChat = chatController.nextChat;
  });

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { id: mockUserId };

    jest.clearAllMocks();
    mockIO.to.mockReset();
    mockIO.emit.mockReset();
    mockChatSession.findOne.mockReset();
    mockQueue.findOneAndUpdate.mockReset();
    mockIO.to.mockReturnThis();
  });

  it('should successfully end chat and return users to queue', async () => {
    const mockSession = {
      _id: mockSessionId,
      participants: [
        { _id: mockUserId, toString: () => mockUserId },
        { _id: mockPartnerId, toString: () => mockPartnerId },
      ],
      status: 'active',
      save: jest.fn().mockResolvedValue(true),
    };

    ChatSession.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSession),
    });

    Queue.findOneAndUpdate.mockResolvedValue({});

    await nextChat(req, res);

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.message).toContain('added back to the queue');

    expect(mockSession.status).toBe('skipped');
    expect(mockSession.endReason).toBe('next_chat');
    expect(mockSession.save).toHaveBeenCalled();

    expect(Queue.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Queue.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: expect.objectContaining({ _id: expect.anything() }) },
      expect.objectContaining({ $set: { status: 'waiting', chatId: null } }),
      expect.any(Object),
    );
  });

  it('should return 404 if no active session found', async () => {
    ChatSession.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await nextChat(req, res);

    expect(res.statusCode).toBe(404);
    const data = res._getJSONData();
    expect(data.success).toBe(false);
    expect(data.message).toBe('No active chat session found');
  });
});
