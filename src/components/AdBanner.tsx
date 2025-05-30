
// src/components/AdBanner.tsx
"use client";

import React, { useEffect } from 'react';
import Script from 'next/script';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  adUnitId: string; // e.g., the ID of the div Adsterra targets
  className?: string;
  // You might need other props depending on Adsterra's specific ad unit code,
  // for example, if they provide width/height or specific script content.
  inlineScriptContent?: string; // For ad unit specific inline scripts
}

export const AdBanner: React.FC<AdBannerProps> = ({
  adUnitId,
  className,
  inlineScriptContent,
}) => {

  useEffect(() => {
    // This useEffect is a placeholder.
    // Adsterra's ad unit code might require specific JavaScript to be executed
    // after their main script has loaded and the ad unit div is in the DOM.
    // Consult Adsterra's documentation for the exact implementation.
    // For example, they might have a global object with a function to call:
    // if (window.adsterra && typeof window.adsterra.loadUnit === 'function') {
    //   window.adsterra.loadUnit(adUnitId);
    // }
    // console.log(`Ad unit ${adUnitId} is ready for Adsterra to populate.`);

    // If there's no inline script and Adsterra's main script handles everything by ID,
    // this useEffect might not even be necessary.
  }, [adUnitId]);

  return (
    <div className={cn("my-4 flex justify-center items-center border p-2 min-h-[100px] bg-muted/20 w-full", className)}>
      {/* This is where Adsterra's ad unit code (often a div) would go */}
      <div id={adUnitId}>
        {/* Ad content will be loaded here by Adsterra's script */}
        <p className="text-sm text-muted-foreground">Advertisement Placeholder ({adUnitId})</p>
      </div>

      {/* If Adsterra provides an inline script specific to this ad unit, load it here */}
      {inlineScriptContent && (
        <Script
          id={`adsterra-unit-script-${adUnitId}`}
          strategy="lazyOnload" // Load when browser is idle
          dangerouslySetInnerHTML={{
            __html: inlineScriptContent,
          }}
        />
      )}
    </div>
  );
};
