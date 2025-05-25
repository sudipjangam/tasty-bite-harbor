
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

const AuthLoader = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(66);
      
      const secondTimer = setTimeout(() => {
        setProgress(100);
      }, 400);
      
      return () => clearTimeout(secondTimer);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-sidebar-purple" />
          <h2 className="text-2xl font-semibold tracking-tight">Authenticating</h2>
          <p className="text-muted-foreground">Please wait while we verify your credentials</p>
        </div>
        
        <div className="space-y-2 w-full">
          <Progress value={progress} className="h-2 bg-gray-200 transition-all">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }}></div>
          </Progress>
          <p className="text-sm text-muted-foreground">Loading your restaurant dashboard...</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLoader;
