
import React from "react";
import { Upload, FileText, Image, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface FileUploadButtonProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled: boolean;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ 
  fileInputRef, 
  onFileUpload, 
  isDisabled 
}) => {
  const supportedFormats = [
    { icon: <BarChart3 className="h-4 w-4" />, name: "CSV", desc: "Spreadsheet data" },
    { icon: <FileText className="h-4 w-4" />, name: "Excel", desc: "Workbook files" },
    { icon: <FileText className="h-4 w-4" />, name: "PDF", desc: "Document files" },
    { icon: <Image className="h-4 w-4" />, name: "Images", desc: "Visual content" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-2 border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800 font-medium px-4 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
          disabled={isDisabled}
        >
          <Upload className="h-4 w-4 mr-2" /> 
          Upload File for Analysis
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Upload File</h3>
              <p className="text-sm text-gray-600">AI will analyze your file content</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Supported formats:</h4>
            <div className="grid grid-cols-2 gap-2">
              {supportedFormats.map((format, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="text-indigo-600">
                    {format.icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{format.name}</div>
                    <div className="text-xs text-gray-500">{format.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white hover:file:from-indigo-600 hover:file:to-purple-700 file:cursor-pointer file:transition-all file:duration-300"
            accept="image/*,.csv,.xlsx,.xls,.pdf,.ppt,.pptx"
            disabled={isDisabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FileUploadButton;
