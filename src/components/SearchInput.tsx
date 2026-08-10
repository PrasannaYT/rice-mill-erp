'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useRef } from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({ placeholder = 'Search...' }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set('q', term);
      } else {
        params.delete('q');
      }
      
      // Push without scrolling
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  return (
    <div className="sticky top-14 sm:top-16 z-20 bg-[var(--bg)] pb-4 pt-2 -mt-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[var(--muted)]" />
        </div>
        <input
          type="search"
          aria-label={placeholder}
          className="input-brutal w-full min-h-[48px]"
          style={{ paddingLeft: '2.5rem' }}
          placeholder={placeholder}
          value={searchTerm}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
