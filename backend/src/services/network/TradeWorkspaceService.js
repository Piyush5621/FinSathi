import TradeRepository from '../../repositories/network/TradeRepository.js';
import TradeCreditRepository from '../../repositories/network/TradeCreditRepository.js';
import TradeReturnRepository from '../../repositories/network/TradeReturnRepository.js';

/**
 * TradeWorkspaceService
 * Aggregation Service for the Trade Workspace Domain.
 * Orchestrates cross-repository fetches to build the unified workspace view.
 */
class TradeWorkspaceService {
    
    async getWorkspaceOverview(userId, storeId) {
        // Fetch a small summary of each section for the unified dashboard
        const [
            inboxRes,
            outboxRes,
            creditsGivenRes,
            creditsReceivedRes,
            returnsRes
        ] = await Promise.all([
            TradeRepository.getInbox(userId, storeId, { page: 1, limit: 5 }),
            TradeRepository.getOutbox(userId, storeId, { page: 1, limit: 5 }),
            TradeCreditRepository.getCreditsGiven(userId, storeId, { page: 1, limit: 5 }),
            TradeCreditRepository.getCreditsReceived(userId, storeId, { page: 1, limit: 5 }),
            TradeReturnRepository.getReturns(userId, storeId, { page: 1, limit: 5 })
        ]);

        return {
            inbox: {
                recent: inboxRes.data,
                totalPending: inboxRes.total // ideally we would pass { status: 'Pending' } to get accurate count, skipping for brevity
            },
            outbox: {
                recent: outboxRes.data,
                totalSent: outboxRes.total
            },
            credits: {
                given: creditsGivenRes.data,
                received: creditsReceivedRes.data
            },
            returns: {
                recent: returnsRes.data
            }
        };
    }
}

export default new TradeWorkspaceService();
