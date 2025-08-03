import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface PendingDocument {
  file: File;
  documentType: string;
  documentNumber: string;
  preview: string;
}

interface DocumentUploadInlineProps {
  pendingDocuments: PendingDocument[];
  onDocumentsChange: (documents: PendingDocument[]) => void;
  staffId?: string; // For editing existing staff
  restaurantId: string;
}

const DOCUMENT_TYPES = [
  { value: 'aadhar_card', label: 'Aadhar Card', required: true },
  { value: 'pan_card', label: 'PAN Card', required: false },
  { value: 'voter_id', label: 'Voter ID', required: false },
  { value: 'driving_license', label: 'Driving License', required: false },
  { value: 'other', label: 'Other', required: false },
];

export default function DocumentUploadInline({
  pendingDocuments,
  onDocumentsChange,
  staffId,
  restaurantId
}: DocumentUploadInlineProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload JPG, PNG, or PDF files only",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const addToPending = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type",
        variant: "destructive"
      });
      return;
    }

    // Check if Aadhar card exists in pending or uploaded
    const hasAadhar = pendingDocuments.some(doc => doc.documentType === 'aadhar_card');
    if (!hasAadhar && documentType !== 'aadhar_card') {
      toast({
        title: "Aadhar Card Required",
        description: "Please add Aadhar card first before other documents",
        variant: "destructive"
      });
      return;
    }

    // Check if document type already exists
    const existingDoc = pendingDocuments.find(doc => doc.documentType === documentType);
    if (existingDoc) {
      toast({
        title: "Document exists",
        description: "This document type has already been added",
        variant: "destructive"
      });
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(selectedFile);

    const newDocument: PendingDocument = {
      file: selectedFile,
      documentType,
      documentNumber: documentNumber || '',
      preview
    };

    onDocumentsChange([...pendingDocuments, newDocument]);

    // Reset form
    setSelectedFile(null);
    setDocumentType('');
    setDocumentNumber('');
    
    // Reset file input
    const fileInput = document.getElementById('document-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    toast({
      title: "Document added",
      description: "Document will be uploaded when staff is saved",
    });
  };

  const removeFromPending = (index: number) => {
    const updatedDocs = pendingDocuments.filter((_, i) => i !== index);
    onDocumentsChange(updatedDocs);
  };

  const uploadAllDocuments = async (newStaffId: string) => {
    if (pendingDocuments.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalDocs = pendingDocuments.length;
      let completed = 0;

      for (const doc of pendingDocuments) {
        // Convert file to base64
        const base64Promise = new Promise<string>((resolve, reject) => {
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

        const base64File = await base64Promise;

        // Upload to Google Drive via edge function
        const { data, error } = await supabase.functions.invoke('google-drive-upload', {
          body: {
            file: base64File,
            fileName: doc.file.name,
            mimeType: doc.file.type,
            staffId: newStaffId,
            documentType: doc.documentType,
            documentNumber: doc.documentNumber,
            restaurantId
          }
        });

        if (error) {
          throw new Error(`Failed to upload ${doc.documentType}: ${error.message}`);
        }

        if (!data.success) {
          throw new Error(`Failed to upload ${doc.documentType}: ${data.error || 'Upload failed'}`);
        }

        completed++;
        setUploadProgress((completed / totalDocs) * 100);
      }

      toast({
        title: "Documents uploaded",
        description: `${totalDocs} document(s) uploaded successfully to Google Drive`,
      });

      // Clear pending documents
      onDocumentsChange([]);

    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: "Document upload failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getDocumentStatus = (documentType: string) => {
    const doc = pendingDocuments.find(d => d.documentType === documentType);
    const typeInfo = DOCUMENT_TYPES.find(t => t.value === documentType);
    
    if (doc) {
      return { status: 'pending', document: doc };
    }
    
    if (typeInfo?.required) {
      return { status: 'required' };
    }
    
    return { status: 'optional' };
  };

  return (
    <div className="space-y-4">
      {/* Add Document Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="document-type" className="text-sm font-medium text-gray-700">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label} {type.required && '*'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="document-number" className="text-sm font-medium text-gray-700">Document Number</Label>
          <Input
            id="document-number"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Enter number"
            className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
          />
        </div>

        <div>
          <Label htmlFor="document-file" className="text-sm font-medium text-gray-700">Select File</Label>
          <Input
            id="document-file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            className="mt-1 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
          />
        </div>
      </div>

      <Button 
        type="button"
        onClick={addToPending} 
        disabled={!selectedFile || !documentType}
        variant="outline"
        className="w-full border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700"
      >
        <Upload className="h-4 w-4 mr-2" />
        Add Document
      </Button>

      {/* Document Status */}
      {pendingDocuments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Pending Documents:</Label>
          {pendingDocuments.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">
                  {DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label}
                </span>
                {doc.documentNumber && (
                  <span className="text-xs text-gray-500">({doc.documentNumber})</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeFromPending(index)}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-600 mt-1">Uploading documents... {Math.round(uploadProgress)}%</p>
        </div>
      )}

      {/* Document Requirements */}
      <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-1 mb-1">
          <AlertCircle className="h-3 w-3 text-yellow-600" />
          <span className="font-medium">Document Requirements:</span>
        </div>
        <ul className="space-y-1 ml-4">
          <li>• Aadhar Card is compulsory for all staff members</li>
          <li>• Other documents (PAN, Voter ID, etc.) are optional</li>
          <li>• Supported formats: JPG, PNG, PDF (Max 5MB each)</li>
          <li>• Documents will be uploaded when staff is saved</li>
        </ul>
      </div>
    </div>
  );
}