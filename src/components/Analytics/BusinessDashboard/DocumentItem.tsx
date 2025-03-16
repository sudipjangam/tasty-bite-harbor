
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  FileText, 
  Image, 
  File, 
  Download, 
  Eye, 
  BarChart2, 
  Calendar 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DocumentItemProps {
  id: string;
  name: string;
  type: string;
  date: string;
  insights: string;
  url?: string;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  id,
  name,
  type,
  date,
  insights,
  url
}) => {
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "Excel":
      case "CSV":
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case "PDF":
        return <FileText className="h-4 w-4 text-red-600" />;
      case "Image":
        return <Image className="h-4 w-4 text-blue-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex justify-between items-center border-b pb-3 last:border-0">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          {getFileIcon(type)}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-sm">{name}</h4>
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{insights}</p>
          <div className="flex items-center mt-1">
            <Calendar className="h-3 w-3 text-gray-500 mr-1" />
            <span className="text-xs text-gray-500">{new Date(date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 px-2 border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          <Eye className="h-3.5 w-3.5 mr-1" /> View
        </Button>
        {type === "Excel" && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 px-2 border-purple-500 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20"
          >
            <BarChart2 className="h-3.5 w-3.5 mr-1" /> Analyze
          </Button>
        )}
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 px-2"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default DocumentItem;
