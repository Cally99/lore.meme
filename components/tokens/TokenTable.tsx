"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";

// Define Token interface
interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  description: string;
  story: string;
  image_url: string;
  created_at: string;
  created_by: string;
  creator_type?: string;
  telegram?: string;
  email: string;
  twitter?: string;
  dexscreener?: string;
  featured: boolean;
  status: string;
  good_lores: number;
  price_change_percentage_1h?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d?: number;
  total_volume?: number;
}

// Define TokenTableProps interface
interface TokenTableProps {
  tokens: Token[];
  showSorting?: boolean;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  startRank?: number;
  showHeader?: boolean;
}

// Helper functions
function cleanTokenName(name: string): string {
  return name
    .replace(/\s*if\s*\([^)]*\)\s*/gi, "")
    .replace(/\s*\(token\.featured\)\s*/gi, "")
    .trim();
}

function getCreatorType(token: Token): string {
  return token.creator_type || "Community";
}

function formatTimeAgo(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "< 1h";
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return `${Math.floor(diffInDays / 7)}w`;
  } catch {
    return "N/A";
  }
}

function formatPercentageChange(percentage: number | undefined): string {
  if (percentage === undefined || percentage === null) return "N/A";
  const value = parseFloat(percentage.toString());
  if (isNaN(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getRankBadgeColor(rank: number): string {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold";
  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-black font-bold";
  if (rank === 3) return "bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold";
  return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
}

export default function TokenTable({
  tokens = [],
  showSorting = false,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortField,
  sortDirection,
  startRank = 1,
  showHeader = true,
}: TokenTableProps) {
  const getSortIcon = (field: string) => {
    if (!showSorting || sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSort = (field: string) => {
    if (!showSorting || !onSort) return;
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    onSort(field, newDirection);
  };

  const handlePageChange = (page: number) => {
    if (onPageChange && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="w-full">
      {/* Desktop Grid Layout - Matches homepage exactly */}
      <div className="hidden md:block">
        {/* Desktop Header - Only show when showHeader is true */}
        {showHeader && (
          <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">Token</div>
            <div className="col-span-2 text-center">24h Change</div>
            <div className="col-span-2 text-center">
              <div className="flex items-center gap-1 justify-center">
                <Heart className="h-4 w-4" />
                Lores
              </div>
            </div>
            <div className="col-span-2 text-center">Age</div>
            <div className="col-span-2 text-center">Added By</div>
          </div>
        )}

        {/* Desktop Body - Uses same grid structure */}
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {tokens.map((token, index) => {
            const globalRank = startRank + index;
            const priceChange = token.price_change_percentage_24h;
            const isPositive = priceChange !== undefined && priceChange !== null && priceChange >= 0;
            const hasValidPriceData = priceChange !== undefined && priceChange !== null;

            return (
              <div
                key={token.id}
                className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Rank - col-span-1 */}
                <div className="col-span-1 flex items-center justify-center">
                  <Badge className={`text-sm ${getRankBadgeColor(globalRank)}`}>
                    {globalRank}
                  </Badge>
                </div>

                {/* Token - col-span-3 */}
                <div className="col-span-3 flex items-center">
                  <Link
                    href={`/token/${encodeURIComponent(token.symbol)}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={token.image_url || "/placeholder.svg?height=48&width=48"}
                        alt={cleanTokenName(token.name)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg?height=48&width=48";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100 text-lg break-words">
                          {cleanTokenName(token.name)}
                        </span>
                        {token.featured && (
                          <Badge className="bg-yellow-500 text-black text-xs">★</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 break-all">{token.symbol}</div>
                    </div>
                  </Link>
                </div>

                {/* 24h Change - col-span-2 */}
                <div className="col-span-2 flex items-center justify-center">
                  {hasValidPriceData ? (
                    <div className={`flex items-center justify-center gap-1 font-medium text-lg ${
                      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPercentageChange(priceChange)}
                    </div>
                  ) : (
                    <span className="font-medium text-lg text-slate-500 dark:text-slate-400">N/A</span>
                  )}
                </div>

                {/* Lores - col-span-2 */}
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    <span className="text-slate-900 dark:text-slate-100 text-lg">{token.good_lores || 0}</span>
                  </div>
                </div>

                {/* Age - col-span-2 */}
                <div className="col-span-2 flex items-center justify-center">
                  <span className="text-slate-600 dark:text-slate-400 text-lg">{formatTimeAgo(token.created_at)}</span>
                </div>

                {/* Added By - col-span-2 */}
                <div className="col-span-2 flex items-center justify-center">
                  <Badge
                    variant="secondary"
                    className={`px-4 py-2 text-sm font-medium ${
                      getCreatorType(token) === "Owner"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {getCreatorType(token)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Table with horizontal scroll */}
      <div className="block md:hidden bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] table-fixed">
            {/* Mobile Header - ALWAYS show on mobile */}
            <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-center px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[10%]">#</th>
                  <th className="text-left px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[30%]">Token</th>
                  <th className="text-center px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[15%]">24h Change</th>
                  <th className="text-center px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[15%]">
                    <div className="flex items-center justify-center gap-1">
                      <Heart className="w-4 h-4" />
                      Lores
                    </div>
                  </th>
                  <th className="text-center px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[10%]">Age</th>
                  <th className="text-center px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-[20%]">Added By</th>
                </tr>
              </thead>
            {/* Mobile Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {tokens.map((token, index) => {
                const globalRank = startRank + index;
                const priceChange = token.price_change_percentage_24h;
                const isPositive = priceChange !== undefined && priceChange !== null && priceChange >= 0;
                const hasValidPriceData = priceChange !== undefined && priceChange !== null;

                return (
                  <tr key={token.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Rank */}
                    <td className="px-3 py-4 text-center">
                      <Badge className={`text-xs ${getRankBadgeColor(globalRank)}`}>
                        {globalRank}
                      </Badge>
                    </td>

                    {/* Token */}
                    <td className="px-3 py-4">
                      <Link
                        href={`/token/${encodeURIComponent(token.symbol)}`}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={token.image_url || "/placeholder.svg?height=40&width=40"}
                            alt={cleanTokenName(token.name)}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg?height=40&width=40";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-slate-900 dark:text-slate-100 text-sm break-words leading-tight">
                              {cleanTokenName(token.name)}
                            </span>
                            {token.featured && (
                              <Badge className="bg-yellow-500 text-black text-xs">★</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 break-all leading-tight">{token.symbol}</div>
                        </div>
                      </Link>
                    </td>

                    {/* 24h Change */}
                    <td className="px-3 py-4 text-center">
                      {hasValidPriceData ? (
                        <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
                          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatPercentageChange(priceChange)}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Lores */}
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span className="text-slate-900 dark:text-slate-100 text-sm">{token.good_lores || 0}</span>
                      </div>
                    </td>

                    {/* Age */}
                    <td className="px-3 py-4 text-center">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{formatTimeAgo(token.created_at)}</span>
                    </td>

                    {/* Added By */}
                    <td className="px-3 py-4 text-center">
                      <Badge
                        variant="secondary"
                        className={`text-xs px-2 py-1 ${
                          getCreatorType(token) === "Owner"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {getCreatorType(token)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400 self-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {tokens.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Heart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">No tokens found</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
            Check back later for new tokens
          </p>
        </div>
      )}
    </div>
  );
}