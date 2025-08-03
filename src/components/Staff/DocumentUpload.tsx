import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface StaffDocument {
  id: string;
  document_type: string;
  document_number: string | null;
  document_name: string;
  google_drive_url: string | null;
  is_verified: boolean | null;
  created_at: string;
}

interface DocumentUploadProps {
  staffId: string;
  restaurantId: string;
  documents: StaffDocument[];
  onDocumentUploaded: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'aadhar_card', label: 'Aadhar Card', required: true },
  { value: 'pan_card', label: 'PAN Card', required: false },
  { value: 'voter_id', label: 'Voter ID', required: false },
  { value: 'driving_license', label: 'Driving License', required: false },
  { value: 'other', label: 'Other', required: false },
];

export default function DocumentUpload({ staffId, restaurantId, documents, onDocumentUploaded }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
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

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type",
        variant: "destructive"
      });
      return;
    }

    // Check if Aadhar card already exists for required validation
    const hasAadhar = documents.some(doc => doc.document_type === 'aadhar_card');
    if (!hasAadhar && documentType !== 'aadhar_card') {
      toast({
        title: "Aadhar Card Required",
        description: "Please upload Aadhar card first before other documents",
        variant: "destructive"
      });
      return;
    }

    // Check if document type already exists
    const existingDoc = documents.find(doc => doc.document_type === documentType);
    if (existingDoc) {
      toast({
        title: "Document exists",
        description: "This document type has already been uploaded",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
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
        reader.readAsDataURL(selectedFile);
      });

      const base64File = await base64Promise;
      setUploadProgress(40);

      // Upload to Google Drive via edge function
      const { data, error } = await supabase.functions.invoke('google-drive-upload', {
        body: {
          file: base64File,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          staffId,
          documentType,
          documentNumber: documentNumber || null,
          restaurantId
        }
      });

      setUploadProgress(80);

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);

      toast({
        title: "Document uploaded successfully",
        description: `${DOCUMENT_TYPES.find(t => t.value === documentType)?.label} has been uploaded and saved to Google Drive`,
      });

      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      setDocumentNumber('');
      setUploadProgress(0);
      
      // Trigger refresh
      onDocumentUploaded();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "Document has been removed successfully",
      });

      onDocumentUploaded();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const getDocumentStatus = (documentType: string) => {
    const doc = documents.find(d => d.document_type === documentType);
    const typeInfo = DOCUMENT_TYPES.find(t => t.value === documentType);
    
    if (doc) {
      return {
        status: 'uploaded',
        verified: doc.is_verified,
        document: doc
      };
    }
    
    if (typeInfo?.required) {
      return { status: 'required', verified: false };
    }
    
    return { status: 'optional', verified: false };
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-600" />
            Upload Staff Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
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
              <Label htmlFor="document-number">Document Number</Label>
              <Input
                id="document-number"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter document number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="file-upload">Select File *</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: JPG, PNG, PDF (Max 5MB)
            </p>
          </div>

          {uploading && (
            <div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !documentType || uploading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Document Status */}
      <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Document Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map((type) => {
              const status = getDocumentStatus(type.value);
              return (
                <div key={type.value} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {status.status === 'uploaded' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : status.status === 'required' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium">
                        {type.label} {type.required && <span className="text-red-500">*</span>}
                      </span>
                    </div>
                    {status.document && (
                      <span className="text-sm text-gray-500">
                        ({status.document.document_number || 'No number'})
                      </span>
                    )}
                  </div>

                  {status.status === 'uploaded' && status.document && (
                    <div className="flex items-center gap-2">
                      {status.verified ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Pending
                        </span>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(status.document!.google_drive_url!, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(status.document!.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}