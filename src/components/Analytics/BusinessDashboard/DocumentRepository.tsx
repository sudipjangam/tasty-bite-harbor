
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  File, 
  FileSpreadsheet, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  BarChart2, 
  Calendar 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FileAnalysisUploader from "../FileAnalysisUploader";

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  date: string;
  insights: string;
  url?: string;
}

const DocumentRepository = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: "doc1",
      name: "Sales_Report_Q2.xlsx",
      type: "Excel",
      date: "2023-06-30",
      insights: "Total sales: ₹456,789 with 1,234 transactions",
      url: "#"
    },
    {
      id: "doc2",
      name: "Inventory_Jun2023.xlsx",
      type: "Excel",
      date: "2023-06-28",
      insights: "54 items below reorder level, restocking needed",
      url: "#"
    },
    {
      id: "doc3",
      name: "Tax_Invoice_GST.pdf",
      type: "PDF",
      date: "2023-06-15",
      insights: "Vendor invoice processed. Payment due by July 15.",
      url: "#"
    },
    {
      id: "doc4",
      name: "Menu_Design_Final.jpg",
      type: "Image",
      date: "2023-05-22",
      insights: "Menu design approved for summer season",
      url: "#"
    },
    {
      id: "doc5",
      name: "Staff_Schedule_Jul.xlsx",
      type: "Excel",
      date: "2023-06-25",
      insights: "28 staff members, 960 hours scheduled",
      url: "#"
    }
  ]);

  const handleFileUploaded = (fileData: { name: string; type: string; date: string; insights: string; url?: string }) => {
    const newDocument: DocumentItem = {
      id: `doc${documents.length + 1}`,
      ...fileData
    };
    
    setDocuments([newDocument, ...documents]);
  };

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
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Document Repository</CardTitle>
          <FileAnalysisUploader 
            onFileUploaded={handleFileUploaded}
            variant="inline"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="flex justify-between items-center border-b pb-3 last:border-0"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  {getFileIcon(doc.type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{doc.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {doc.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{doc.insights}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">{new Date(doc.date).toLocaleDateString()}</span>
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
                {doc.type === "Excel" && (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentRepository;
