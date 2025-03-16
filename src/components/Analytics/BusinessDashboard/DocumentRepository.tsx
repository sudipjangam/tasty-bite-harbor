
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import FileAnalysisUploader from "../FileAnalysisUploader";
import DocumentItem, { DocumentItemProps } from "./DocumentItem";

const DocumentRepository = () => {
  const [documents, setDocuments] = useState<DocumentItemProps[]>([
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
    const newDocument: DocumentItemProps = {
      id: `doc${documents.length + 1}`,
      ...fileData
    };
    
    setDocuments([newDocument, ...documents]);
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
            <DocumentItem 
              key={doc.id}
              id={doc.id}
              name={doc.name}
              type={doc.type}
              date={doc.date}
              insights={doc.insights}
              url={doc.url}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentRepository;
