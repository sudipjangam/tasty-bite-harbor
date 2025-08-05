import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Trash2, ExternalLink, Plus, CheckCircle, AlertCircle } from "lucide-react";
import type { StaffDocument } from "@/types/staff";

interface PendingDocument {
  file: File;
  documentType: string;
  documentNumber?: string;
  preview: string;
}

interface MultipleDocumentUploadProps {
  staffId: string;
  restaurantId: string;
  documents: StaffDocument[];
  onDocumentUploaded: () => void;
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
  { value: "other", label: "Other Document", required: false },
];

const MultipleDocumentUpload: React.FC<MultipleDocumentUploadProps> = ({
  staffId,
  restaurantId,
  documents,
  onDocumentUploaded,
}) => {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image (JPG, PNG) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const addToPending = () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type.",
        variant: "destructive",
      });
      return;
    }

    // Check if this document type is already uploaded or pending
    const docType = DOCUMENT_TYPES.find(dt => dt.value === documentType);
    const existingDoc = documents.find(doc => doc.document_type === documentType);
    const pendingDoc = pendingDocuments.find(doc => doc.documentType === documentType);
    
    if (existingDoc) {
      toast({
        title: "Document already exists",
        description: `${docType?.label} is already uploaded for this staff member.`,
        variant: "destructive",
      });
      return;
    }

    if (pendingDoc) {
      toast({
        title: "Document already pending",
        description: `${docType?.label} is already added to pending uploads.`,
        variant: "destructive",
      });
      return;
    }

    // Validate required document number for certain types
    if ((documentType === 'aadhar_card' || documentType === 'pan_card' || documentType === 'driving_license') && !documentNumber.trim()) {
      toast({
        title: "Document number required",
        description: `${docType?.label} requires a document number.`,
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(selectedFile);
    const newDoc: PendingDocument = {
      file: selectedFile,
      documentType,
      documentNumber: documentNumber.trim() || undefined,
      preview,
    };

    setPendingDocuments(prev => [...prev, newDoc]);
    
    // Reset form
    setSelectedFile(null);
    setDocumentType("");
    setDocumentNumber("");
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    toast({
      title: "Document added",
      description: `${docType?.label} added to upload queue.`,
    });
  };

  const removeFromPending = (index: number) => {
    setPendingDocuments(prev => {
      const newDocs = [...prev];
      URL.revokeObjectURL(newDocs[index].preview);
      newDocs.splice(index, 1);
      return newDocs;
    });
  };

  const uploadAllDocuments = useMutation({
    mutationFn: async () => {
      if (pendingDocuments.length === 0) {
        throw new Error("No documents to upload");
      }

      setIsUploading(true);
      setUploadProgress(0);

      const uploadedDocs = [];
      
      for (let i = 0; i < pendingDocuments.length; i++) {
        const doc = pendingDocuments[i];
        
        try {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                const base64String = e.target.result.toString().split(',')[1];
                resolve(base64String);
              } else {
                reject(new Error('Failed to convert file to base64'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(doc.file);
          });

          // Upload to Google Drive via edge function
          const { data, error } = await supabase.functions.invoke('google-drive-upload', {
            body: {
              file: base64,
              fileName: doc.file.name,
              mimeType: doc.file.type,
              staffId,
              documentType: doc.documentType,
              documentNumber: doc.documentNumber,
              restaurantId,
            }
          });

          if (error) {
            throw new Error(`Upload failed: ${error.message}`);
          }

          if (!data.success) {
            throw new Error(data.error || 'Upload failed');
          }

          uploadedDocs.push(data.document);
          
          // Update progress
          const progress = ((i + 1) / pendingDocuments.length) * 100;
          setUploadProgress(progress);
          
        } catch (error) {
          console.error(`Failed to upload ${doc.file.name}:`, error);
          throw new Error(`Failed to upload ${doc.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return uploadedDocs;
    },
    onSuccess: (uploadedDocs) => {
      toast({
        title: "Upload successful",
        description: `${uploadedDocs.length} document(s) uploaded successfully.`,
      });
      
      // Clear pending documents and clean up preview URLs
      pendingDocuments.forEach(doc => URL.revokeObjectURL(doc.preview));
      setPendingDocuments([]);
      setUploadProgress(0);
      setIsUploading(false);
      
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["staff-documents", staffId] });
      onDocumentUploaded();
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload documents',
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "Document has been removed successfully.",
      });
      
      onDocumentUploaded();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: "destructive",
      });
    }
  };

  const getDocumentStatus = (docType: string) => {
    const existing = documents.find(doc => doc.document_type === docType);
    const pending = pendingDocuments.find(doc => doc.documentType === docType);
    const typeInfo = DOCUMENT_TYPES.find(dt => dt.value === docType);
    
    if (existing) {
      return { status: 'uploaded', verified: existing.is_verified, document: existing };
    } else if (pending) {
      return { status: 'pending', verified: false };
    } else if (typeInfo?.required) {
      return { status: 'required', verified: false };
    } else {
      return { status: 'optional', verified: false };
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Upload className="h-5 w-5" />
            Add New Document
          </CardTitle>
          <CardDescription>
            Upload staff documents securely to Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} {type.required && "*"}
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
                placeholder={documentType ? "Enter document number" : "Select type first"}
                disabled={!documentType}
              />
            </div>
            
            <div>
              <Label htmlFor="file-input">Select File *</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
          </div>
          
          <Button 
            onClick={addToPending}
            disabled={!selectedFile || !documentType}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Upload Queue
          </Button>
        </CardContent>
      </Card>

      {/* Pending Documents */}
      {pendingDocuments.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <FileText className="h-5 w-5" />
              Pending Uploads ({pendingDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingDocuments.map((doc, index) => {
                const typeInfo = DOCUMENT_TYPES.find(dt => dt.value === doc.documentType);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{typeInfo?.label}</p>
                        <p className="text-sm text-gray-500">
                          {doc.documentNumber && `${doc.documentNumber} • `}{doc.file.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromPending(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 space-y-3">
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading documents...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <Button 
                onClick={() => uploadAllDocuments.mutate()}
                disabled={isUploading || pendingDocuments.length === 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : `Upload ${pendingDocuments.length} Document(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENT_TYPES.map((type) => {
              const status = getDocumentStatus(type.value);
              return (
                <div key={type.value} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{type.label}</h4>
                    {status.status === 'uploaded' ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    ) : status.status === 'pending' ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    ) : status.status === 'required' ? (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </div>
                  
                  {status.status === 'uploaded' && status.document && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {status.document.document_number && `#${status.document.document_number}`}
                      </p>
                      <div className="flex items-center gap-2">
                        {status.verified ? (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending Verification</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {status.document.google_drive_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(status.document?.google_drive_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(status.document!.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Requirements Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800">Document Requirements:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Accepted formats: JPG, PNG, PDF</li>
              <li>• Maximum file size: 5MB</li>
              <li>• Documents are securely stored in Google Drive</li>
              <li>• Required documents: Aadhar Card, PAN Card</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultipleDocumentUpload;