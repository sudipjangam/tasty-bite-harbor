
import React from "react";
import { Button } from "@/components/ui/button";

const BrandingSection: React.FC = () => {
  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <img 
          src="/logo.svg" 
          alt="Swadeshi Solutions Logo" 
          className="h-16 mb-6"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-deep-blue to-brand-success-green bg-clip-text text-transparent mb-4">
          Swadeshi Solutions
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Efficiently manage your restaurant operations with our comprehensive restaurant management system. From table reservations to inventory tracking, we've got you covered.
        </p>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-brand-success-green/10 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-success-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Complete restaurant management</span>
          </div>
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-brand-warm-orange/10 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-warm-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Real-time analytics and reports</span>
          </div>
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-brand-deep-blue/10 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-deep-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Inventory and staff management</span>
          </div>
        </div>
        <Button 
          variant="link" 
          className="mt-8 p-0 text-brand-deep-blue hover:text-brand-deep-blue/90"
          onClick={() => window.open("https://swadeshisolutions.teleporthq.app", "_blank")}
        >
          Visit our website →
        </Button>
      </div>
    </div>
  );
};

export default BrandingSection;
