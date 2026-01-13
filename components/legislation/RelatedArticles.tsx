'use client';

import Link from "next/link";
import { categorizeBill } from "@/lib/utils/categories";
import { supabasePublic } from "@/lib/supabase";
import { useState, useEffect } from "react";

interface RelatedArticlesProps {
  currentBill: any;
}

export default function RelatedArticles({ currentBill }: RelatedArticlesProps) {
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);

  useEffect(() => {
    const fetchRelatedArticles = async () => {
      try {
        // Get categories for current bill
        const currentCategories = categorizeBill(currentBill);
        
        // Get related bills from same categories (excluding current)
        const { data: relatedBills } = await supabasePublic
          .from('legislation')
          .select('*')
          .neq('bill_id', currentBill.bill_id)
          .order('update_date', { ascending: false }) // Sort by latest legislative action
          .limit(20);

        const allBills = (relatedBills as any[]) || [];

        // Score related bills by category matches
        const scoredBills = allBills.map(bill => {
          const billCategories = categorizeBill(bill);
          const categoryMatches = billCategories.filter(cat => 
            currentCategories.some(currentCat => currentCat.id === cat.id)
          ).length;
          
          return {
            ...bill,
            score: categoryMatches
          };
        });

        // Sort by category matches, then by recency
        const filteredArticles = scoredBills
          .sort((a, b) => b.score - a.score)
          .filter(bill => bill.score > 0) // Only show bills with category matches
          .slice(0, 3); // Top 3 related articles

        setRelatedArticles(filteredArticles);
      } catch (error) {
        console.error('Error fetching related articles:', error);
      }
    };

    fetchRelatedArticles();
  }, [currentBill]);

  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-zinc-200 pt-8 mt-12">
      <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">Related Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedArticles.map((article) => {
          const articleCategories = categorizeBill(article);
          
          return (
            <Link
              key={article.bill_id}
              href={`/legislation-summary/${article.url_slug}`}
              className="block group"
            >
              <div className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:bg-zinc-50 transition-all">
                {/* Category badges */}
                <div className="flex gap-2 mb-3">
                  {articleCategories.slice(0, 2).map((category) => (
                    <span
                      key={category.id}
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        category.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                        category.color === 'red' ? 'bg-red-100 text-red-700' :
                        category.color === 'green' ? 'bg-green-100 text-green-700' :
                        category.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                        category.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                        category.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                        category.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                        category.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
                
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h3>
                
                <p className="text-sm text-zinc-600 line-clamp-3 mb-3">
                  {article.tldr}
                </p>
                
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{article.bill_id}</span>
                  <span>{article.origin_chamber}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-6 text-center">
        <Link
          href="/legislation-summary"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          View all articles →
        </Link>
      </div>
    </section>
  );
}
