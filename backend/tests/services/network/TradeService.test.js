import TradeService from '../../../src/services/network/TradeService.js';
import TradeRepository from '../../../src/repositories/network/TradeRepository.js';
import EventBus from '../../../src/utils/EventBus.js';

jest.mock('../../../src/repositories/network/TradeRepository.js');
jest.mock('../../../src/utils/EventBus.js');

describe('TradeService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a trade and publish TradeCreated event', async () => {
        const senderId = 'sender-123';
        const receiverId = 'receiver-456';
        const tradePayload = {
            receiverId,
            total_amount: 500,
            items: [{ product_name: 'Item 1', quantity: 1, purchase_price: 500 }]
        };

        const mockResult = { id: 'trade-uuid', status: 'Pending', total_amount: 500 };
        TradeRepository.createTrade.mockResolvedValue(mockResult);

        const result = await TradeService.createTrade(senderId, tradePayload);

        expect(result.id).toBe('trade-uuid');
        expect(TradeRepository.createTrade).toHaveBeenCalled();
        expect(EventBus.publish).toHaveBeenCalledWith('TradeCreated', expect.objectContaining({
            userId: senderId,
            aggregateId: 'trade-uuid',
            payload: mockResult
        }));
    });
});
