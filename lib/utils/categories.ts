export interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  color: string;
}

export const categories: Category[] = [
  {
    id: 'technology-law',
    name: 'Technology Law',
    description: 'AI, cybersecurity, social media, and digital policy',
    keywords: ['artificial intelligence', 'ai regulation', 'cybersecurity', 'cyber security', 'social media regulation', 'data privacy', 'online platforms', 'big tech regulation', 'algorithm', 'software', 'computing', 'internet regulation', 'technology law', 'tech policy', 'automation', 'machine learning', 'blockchain', 'cryptocurrency', 'digital rights', 'online content moderation', 'data protection', 'tech companies', 'information technology', 'it', 'computer systems', 'network security'],
    color: 'blue'
  },
  {
    id: 'national-security',
    name: 'National Security',
    description: 'Defense, intelligence, homeland security, and foreign policy',
    keywords: ['defense', 'military', 'intelligence', 'terrorism', 'homeland security', 'pentagon', 'national defense', 'armed forces', 'defense authorization', 'military spending', 'foreign policy', 'security', 'critical minerals', 'trade security', 'cybersecurity', 'cyber security', 'border security', 'veterans', 'military personnel', 'artificial intelligence', 'ai', 'cyber threats'],
    color: 'red'
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Health policy, Medicare, Medicaid, and medical legislation',
    keywords: ['healthcare', 'health care', 'medicare', 'medicaid', 'hospital', 'pharmaceutical', 'fda', 'disease', 'treatment', 'medical', 'health insurance', 'public health', 'medicine', 'clinical', 'patient', 'doctor', 'nursing', 'mental health'],
    color: 'green'
  },
  {
    id: 'economy',
    name: 'Economy',
    description: 'Taxes, finance, banking, and economic policy',
    keywords: ['tax', 'taxes', 'economy', 'financial', 'banking', 'finance', 'economic', 'budget', 'spending', 'debt', 'inflation', 'irs', 'tax code', 'economic growth', 'trade', 'commerce', 'business', 'small business', 'loans', 'credit', 'banking', 'investment'],
    color: 'amber'
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Climate, environment, oil, gas, and renewable energy',
    keywords: ['energy', 'climate', 'environment', 'oil', 'gas', 'renewable', 'solar', 'wind', 'emissions', 'carbon', 'epa', 'environmental protection', 'clean energy', 'nuclear', 'electricity', 'power', 'grid', 'conservation', 'sustainability'],
    color: 'emerald'
  },
  {
    id: 'immigration',
    name: 'Immigration',
    description: 'Border security, visas, asylum, and immigration policy',
    keywords: ['immigration', 'border', 'visa', 'asylum', 'citizenship', 'deportation', 'migrant', 'customs', 'border security', 'immigration reform', 'refugee', 'green card', 'naturalization', 'daca', 'dreamers'],
    color: 'purple'
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Schools, student loans, and education policy',
    keywords: ['education', 'school', 'student', 'student loans', 'college', 'university', 'loan', 'teacher', 'curriculum', 'higher education', 'student aid', 'pell grant', 'tuition', 'academic', 'campus', 'learning', 'scholarship', 'federal student aid', 'student debt'],
    color: 'indigo'
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Transportation, broadband, and public works',
    keywords: ['infrastructure', 'transportation', 'road', 'bridge', 'broadband', 'highway', 'rail', 'airport', 'public works', 'transit', 'high-speed rail', 'water', 'sewer', 'utilities', 'electric grid', 'internet infrastructure', 'rural broadband', 'bridges'],
    color: 'orange'
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    description: 'Other legislation not fitting specific categories',
    keywords: ['government', 'federal', 'administrative', 'regulation', 'policy', 'law', 'legal', 'congress', 'legislative', 'bill', 'act', 'resolution', 'federal employees', 'government operations', 'oversight'],
    color: 'gray'
  }
];

export function categorizeBill(bill: any): Category[] {
  const searchText = [
    bill.title,
    bill.tldr,
    bill.meta_description,
    ...(bill.keywords || [])
  ].join(' ').toLowerCase();

  const matchedCategories: (Category & { matchCount: number; priority: number })[] = [];

  for (const category of categories) {
    // Skip miscellaneous for initial matching (it's our fallback)
    if (category.id === 'miscellaneous') continue;
    
    let matchCount = 0;
    let priority = 1;
    
    // Count exact phrase matches first (higher weight)
    for (const keyword of category.keywords) {
      // Use simple string matching for better performance
      if (searchText.includes(keyword)) {
        // Give higher weight to exact phrase matches
        matchCount += keyword.split(' ').length > 1 ? 2 : 1;
        
        // Boost priority for specific high-value keywords
        if (category.id === 'technology-law' && 
            (keyword.includes('regulation') || keyword.includes('law') || keyword.includes('policy'))) {
          priority += 2;
        }
        
        if (category.id === 'national-security' && 
            (keyword.includes('defense') || keyword.includes('military') || keyword.includes('security'))) {
          priority += 2;
        }
      }
    }

    // Only add if we have meaningful matches
    if (matchCount >= 1) {
      matchedCategories.push({ ...category, matchCount, priority });
    }
  }

  // If no categories matched, assign to miscellaneous
  if (matchedCategories.length === 0) {
    const miscCategory = categories.find(cat => cat.id === 'miscellaneous');
    if (miscCategory) {
      return [miscCategory];
    }
  }

  // Sort by priority first, then match count, and return top 2 categories
  return matchedCategories
    .sort((a, b) => {
      // First sort by priority (descending)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then sort by match count (descending)
      return b.matchCount - a.matchCount;
    })
    .slice(0, 2)
    .map(({ matchCount, priority, ...category }) => category);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id);
}
