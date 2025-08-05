import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Eye, Trash2, Plus, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface Document {
  type: string;
  number: string;
  file_url: string;
  custom_name?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  staffId?: string; // Made optional for backward compatibility
}

const DOCUMENT_TYPES = [
  { value: "aadhar_card", label: "Aadhar Card", required: true },
  { value: "pan_card", label: "PAN Card", required: true },
  { value: "voter_id", label: "Voter ID", required: false },
  { value: "driving_license", label: "Driving License", required: false },
  { value: "passport", label: "Passport", required: false },
  { value: "bank_passbook", label: "Bank Passbook", required: false },
  { value: "salary_certificate", label: "Salary Certificate", required: false },
  { value: "experience_letter", label: "Experience Letter", required: false },
  { value: "education_certificate", label: "Education Certificate", required: false },
  { value: "other", label: "Other", required: false },
];

const DocumentUpload: React.FC<DocumentUploadProps> = ({ documents, onDocumentsChange, staffId }) => {
  const [selectedType, setSelectedType] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  // Mutation to update staff documents in database
  const updateDocumentsMutation = useMutation({
    mutationFn: async (updatedDocuments: Document[]) => {
      if (!staffId) return; // Skip database update if no staffId provided
      
      const { error } = await supabase
        .from("staff")
        .update({ documents: updatedDocuments })
        .eq("id", staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Documents updated",
        description: "Staff documents have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update documents: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file (JPG, PNG, or PDF)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddDocument = async () => {
    if (!selectedType || !documentNumber || !selectedFile) {
      alert('Please fill all required fields and select a file');
      return;
    }

    // Check if document type already exists (except for "other")
    if (selectedType !== "other") {
      const existingDoc = documents.find(doc => doc.type === selectedType);
      if (existingDoc) {
        alert('This document type already exists. Please remove the existing one first.');
        return;
      }
    }

    setUploading(true);
    try {
      const base64File = await convertFileToBase64(selectedFile);
      
      const newDocument: Document = {
        type: selectedType,
        number: documentNumber,
        file_url: base64File,
        custom_name: selectedType === "other" ? customName : undefined,
      };

      const updatedDocuments = [...documents, newDocument];
      onDocumentsChange(updatedDocuments);
      
      // Update database if staffId is provided
      if (staffId) {
        updateDocumentsMutation.mutate(updatedDocuments);
      }

      // Reset form
      setSelectedType("");
      setDocumentNumber("");
      setCustomName("");
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('document-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(updatedDocuments);
    
    // Update database if staffId is provided
    if (staffId) {
      updateDocumentsMutation.mutate(updatedDocuments);
    }
  };

  const handleDownloadDocument = (doc: Document) => {
    try {
      // Create a download link
      const link = document.createElement('a');
      link.href = doc.file_url;
      
      // Generate filename
      const docLabel = getDocumentLabel(doc);
      const extension = doc.file_url.includes('data:application/pdf') ? '.pdf' : '.jpg';
      link.download = `${docLabel}_${doc.number}${extension}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `${docLabel} download has started.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the document.",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatus = (docType: string) => {
    const hasDoc = documents.find(doc => doc.type === docType);
    const docInfo = DOCUMENT_TYPES.find(type => type.value === docType);
    
    if (hasDoc) return { status: "uploaded", variant: "default" as const };
    if (docInfo?.required) return { status: "required", variant: "destructive" as const };
    return { status: "optional", variant: "secondary" as const };
  };

  const getDocumentLabel = (doc: Document) => {
    if (doc.type === "other" && doc.custom_name) {
      return doc.custom_name;
    }
    return DOCUMENT_TYPES.find(type => type.value === doc.type)?.label || doc.type;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Document Form */}
        <div className="space-y-4 border rounded-lg p-4">
          <h4 className="font-medium">Add New Document</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} {type.required && <span className="text-red-500">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document-number">Document Number</Label>
              <Input
                id="document-number"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter document number"
              />
            </div>
          </div>

          {selectedType === "other" && (
            <div>
              <Label htmlFor="custom-name">Document Name</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter document name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="document-file">Upload File</Label>
            <Input
              id="document-file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Accepted formats: JPG, PNG, PDF (Max 5MB)
            </p>
          </div>

          <Button 
            onClick={handleAddDocument}
            disabled={uploading || !selectedType || !documentNumber || !selectedFile}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Add Document"}
          </Button>
        </div>

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {getDocumentLabel(doc)}
                    </Badge>
                    <span className="text-sm">{doc.number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDocument(doc)}
                          title="View document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{getDocumentLabel(doc)} - {doc.number}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          {doc.file_url.includes('data:application/pdf') ? (
                            <embed
                              src={doc.file_url}
                              type="application/pdf"
                              width="100%"
                              height="600px"
                            />
                          ) : (
                            <img
                              src={doc.file_url}
                              alt={getDocumentLabel(doc)}
                              className="max-w-full h-auto"
                            />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(doc)}
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveDocument(index)}
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Status Overview */}
        <div className="space-y-4">
          <h4 className="font-medium">Document Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DOCUMENT_TYPES.filter(type => type.value !== "other").map((docType) => {
              const status = getDocumentStatus(docType.value);
              return (
                <Badge
                  key={docType.value}
                  variant={status.variant}
                  className="justify-center p-2"
                >
                  {docType.label}: {status.status}
                </Badge>
              );
            })}
          </div>
          
          {/* Show "Other" documents */}
          {documents.filter(doc => doc.type === "other").length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Other Documents:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {documents
                  .filter(doc => doc.type === "other")
                  .map((doc, index) => (
                    <Badge key={index} variant="default" className="justify-center p-2">
                      {doc.custom_name}: uploaded
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Requirements Note */}
        <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
          <p className="font-medium mb-2">Document Requirements:</p>
          <ul className="space-y-1">
            <li>• Aadhar Card and PAN Card are required documents</li>
            <li>• All other documents are optional but recommended</li>
            <li>• Accepted formats: JPG, PNG, PDF</li>
            <li>• Maximum file size: 5MB per document</li>
            <li>• For "Other" documents, specify the document name</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;