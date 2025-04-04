import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, File, Image, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DocumentItem from "./DocumentItem";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const DocumentRepository = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Fetch restaurant ID for the current user
  const { data: restaurantId } = useQuery({
    queryKey: ["document-repository-restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      return userProfile?.restaurant_id || null;
    }
  });

  const analyzeDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read file as base64'));
          }
        };
        reader.onerror = reject;
      });

      // First upload the file
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-image', {
        body: { 
          base64Image: base64,
          fileName: selectedFile.name,
          fileType: selectedFile.type
        },
      });

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || "Failed to upload document");
      }

      toast({
        title: "Document uploaded",
        description: "Now analyzing the document...",
      });

      // Use the chat-with-api function to analyze the uploaded document
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('chat-with-api', {
        body: { 
          messages: [
            { 
              role: "user", 
              content: `Please analyze this uploaded document: ${selectedFile.name}. The file is available at ${uploadData.image.url}. Provide detailed business insights based on this document and suggest specific actions.`
            }
          ],
          restaurantId: restaurantId
        },
      });

      if (analysisError) {
        throw new Error(analysisError.message);
      }

      if (analysisData && analysisData.choices && analysisData.choices[0]?.message?.content) {
        setAnalysis(analysisData.choices[0].message.content);
        toast({
          title: "Analysis complete",
          description: "Document has been successfully analyzed",
        });
      } else {
        throw new Error("Failed to get analysis results");
      }
    } catch (error) {
      console.error("Document analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An error occurred during analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Example documents
  const documents = [
    {
      name: "Q2_Financial_Report.xlsx",
      type: "Excel",
      date: "2025-03-15",
      insights: "Q2 revenue increased by 15% compared to Q1, with weekends showing highest growth",
    },
    {
      name: "Customer_Feedback_Summary.pdf",
      type: "PDF",
      date: "2025-03-10",
      insights: "92% customer satisfaction, with suggestions for expanded vegan menu options",
    },
    {
      name: "Inventory_Analysis.xlsx",
      type: "Excel",
      date: "2025-03-05",
      insights: "3 items consistently below reorder levels; recommended supplier changes",
    },
    {
      name: "Staff_Performance.pdf",
      type: "PDF",
      date: "2025-02-28",
      insights: "Evening shift outperforming day shift by 23% in sales per staff hour",
    },
  ];

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "Excel":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "PDF":
        return <File className="h-4 w-4 text-red-600" />;
      case "Image":
        return <Image className="h-4 w-4 text-blue-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFileTypeFromName = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'Excel';
    if (ext === 'pdf') return 'PDF';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'Image';
    return 'Document';
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Document Repository</CardTitle>
          <CardDescription>
            Upload and analyze business documents for actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={analyzeDocument} className="pb-6">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 mb-4 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.gif"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Support for Excel, CSV, PDF and image files
                  </p>
                </div>
              </label>
            </div>
            <div className="flex justify-center">
              <Button type="submit" disabled={!selectedFile || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Document"
                )}
              </Button>
            </div>
          </form>

          {analysis && (
            <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
              <h3 className="text-sm font-semibold mb-2 text-sky-800 dark:text-sky-300">
                AI Analysis Results
              </h3>
              <div className="text-xs text-sky-700 dark:text-sky-400 whitespace-pre-line">
                {analysis}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Recent Documents</h3>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <DocumentItem
                  key={index}
                  name={doc.name}
                  type={doc.type}
                  date={doc.date}
                  insights={doc.insights}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentRepository;
