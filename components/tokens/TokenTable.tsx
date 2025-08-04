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
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Fixed Token Name Column */}
          <div className="w-80 min-w-[200px] max-w-[300px] border-r border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800">
              {showHeader && (
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[60px]"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {showSorting ? (
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          aria-label={`Sort by token name (${sortField === "name" ? sortDirection : "none"})`}
                        >
                          Token {getSortIcon("name")}
                        </button>
                      ) : (
                        "Token"
                      )}
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {tokens.map((token, index) => {
                  const globalRank = startRank + index;
                  return (
                    <tr
                      key={token.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap w-[60px]">
                        <Badge className={`text-sm ${getRankBadgeColor(globalRank)}`}>
                          {globalRank}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/token/${encodeURIComponent(token.symbol)}`}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={token.image_url || "/placeholder.svg?height=40&width=40"}
                            alt={`Logo for ${cleanTokenName(token.name)}`}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg?height=40&width=40";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                                {cleanTokenName(token.name)}
                              </h3>
                              {token.featured && (
                                <Badge className="bg-yellow-500 text-black text-xs">★</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {token.symbol}
                            </p>
                          </div>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Scrollable Other Columns */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800">
              {showHeader && (
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {showSorting ? (
                        <button
                          onClick={() => handleSort("price_change_percentage_24h")}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                          aria-label={`Sort by 24h change (${sortField === "price_change_percentage_24h" ? sortDirection : "none"})`}
                        >
                          24h Change {getSortIcon("price_change_percentage_24h")}
                        </button>
                      ) : (
                        "24h Change"
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {showSorting ? (
                        <button
                          onClick={() => handleSort("good_lores")}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                          aria-label={`Sort by lores (${sortField === "good_lores" ? sortDirection : "none"})`}
                        >
                          <Heart className="h-4 w-4" />
                          Lores {getSortIcon("good_lores")}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <Heart className="h-4 w-4" />
                          Lores
                        </div>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {showSorting ? (
                        <button
                          onClick={() => handleSort("created_at")}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                          aria-label={`Sort by age (${sortField === "created_at" ? sortDirection : "none"})`}
                        >
                          Age {getSortIcon("created_at")}
                        </button>
                      ) : (
                        "Age"
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      Added By
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {tokens.map((token, index) => {
                  const globalRank = startRank + index;
                  const priceChange = token.price_change_percentage_24h || 0;
                  const isPositive = priceChange >= 0;

                  return (
                    <tr
                      key={token.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div
                          className={`flex items-center justify-center gap-1 font-semibold ${
                            isPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatPercentageChange(priceChange)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center gap-1 text-red-500 justify-center">
                          <Heart className="h-4 w-4 fill-current" />
                          <span className="font-semibold">{token.good_lores || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatTimeAgo(token.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
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

        {/* Pagination for Desktop */}
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
      </div>

      {/* Mobile List */}
      <div className="md:hidden">
        {showHeader && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 rounded-t-lg sticky top-0 z-10">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <span className="w-40">Token</span>
              <div className="flex gap-4">
                <span className="w-16 text-center">24h</span>
                <span className="w-16 text-center">Lores</span>
                <span className="w-16 text-center">Age</span>
                <span className="w-16 text-center">Added By</span>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-b-lg">
          {tokens.map((token, index) => {
            const globalRank = startRank + index;
            const priceChange = token.price_change_percentage_24h || 0;
            const isPositive = priceChange >= 0;

            return (
              <div
                key={token.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Link href={`/token/${encodeURIComponent(token.symbol)}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 w-40 min-w-0">
                      <Badge
                        className={`text-xs px-2 py-1 ${getRankBadgeColor(globalRank)} flex-shrink-0`}
                      >
                        {globalRank}
                      </Badge>
                      <img
                        src={token.image_url || "/placeholder.svg?height=32&width=32"}
                        alt={`Logo for ${cleanTokenName(token.name)}`}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg?height=32&width=32";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[120px]">
                            {cleanTokenName(token.name)}
                          </h3>
                          {token.featured && (
                            <Badge className="bg-yellow-500 text-black text-xs flex-shrink-0">
                              ★
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="truncate">{token.symbol}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-16 text-center">
                        <div
                          className={`flex items-center justify-center gap-1 text-xs font-semibold ${
                            isPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatPercentageChange(priceChange)}
                        </div>
                      </div>
                      <div className="w-16 text-center">
                        <div className="flex items-center gap-1 text-red-500 justify-center">
                          <Heart className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-xs">{token.good_lores || 0}</span>
                        </div>
                      </div>
                      <div className="w-16 text-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {formatTimeAgo(token.created_at)}
                        </span>
                      </div>
                      <div className="w-16 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            getCreatorType(token) === "Owner"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {getCreatorType(token) === "Owner" ? "Owner" : "Comm"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Pagination for Mobile */}
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
      </div>

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