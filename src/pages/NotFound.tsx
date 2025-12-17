import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center space-y-8 max-w-lg w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
          <h1 className="relative text-[150px] font-black leading-none bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent select-none">
            404
          </h1>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button 
            asChild 
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-8 rounded-full"
          >
            <a href="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Return Home
            </a>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            className="w-full sm:w-auto border-2 h-12 px-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
              Go Back
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
