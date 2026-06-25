import { supabase } from '../config/db.js';

/**
 * Get all schemes matching user profile
 */
export const getMatchedSchemes = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get user profile details for matching
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('city, business_type') // Reduced until more fields are confirmed
      .eq('id', userId)
      .single();

    if (userErr || !user) {
        // Fallback to empty profile instead of throwing 500
        console.warn('Matching with incomplete profile for user:', userId);
    }

    // 2. Fetch schemes
    // Note: Filtering is ideally done via PostgREST, but for score calculation we fetch and filter
    const { data: schemes, error: schemesErr } = await supabase
      .from('schemes')
      .select('*');

    if (schemesErr) throw schemesErr;

    // 3. Simple Matching Algorithm
    const matchedSchemes = schemes.map(scheme => {
      let score = 0;
      const criteria = scheme.eligibility_criteria || {};
      
      // Match business type
      if (criteria.business_type && user?.business_type && criteria.business_type.includes(user.business_type)) {
        score += 40;
      }

      // Match tags (dummy match for demo)
      if (criteria.tags) {
        score += 20;
      }

      // State check (assuming city/state extraction)
      if (scheme.state === 'national') {
        score += 40;
      }

      return { ...scheme, match_score: score };
    }).filter(s => s.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score);

    res.status(200).json(matchedSchemes);
  } catch (error) {
    console.error('Scheme match error:', error);
    res.status(500).json({ error: 'Failed to fetch matched schemes' });
  }
};

/**
 * Dismiss a scheme match
 */
export const dismissScheme = async (req, res) => {
  try {
    const { schemeId } = req.params;
    const userId = req.user.id;

    await supabase
      .from('user_scheme_matches')
      .upsert({ user_id: userId, scheme_id: schemeId, dismissed: true }, { onConflict: 'user_id, scheme_id' });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss scheme' });
  }
};
