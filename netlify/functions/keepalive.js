export const config = { schedule: "0 8 */5 * *" };

const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5cmpxYmF1dHlrbGVmaHF6cWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDgwNjUsImV4cCI6MjA5NjY4NDA2NX0.EXBSK0ZLJUsWt1iQ8btA1FkQE_aPT_MFkdgEhkP4Gh0';

export default async () => {
  await fetch(`${SUPABASE_URL}/rest/v1/contratos?limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
};
