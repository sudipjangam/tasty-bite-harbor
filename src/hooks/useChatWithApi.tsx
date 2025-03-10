
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export const useChatWithApi = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your restaurant dashboard assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  // Fetch the restaurant ID for the current user
  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .maybeSingle();

      if (!userProfile?.restaurant_id) {
        console.warn("No restaurant ID found for current user");
      } else {
        console.log("Using restaurant ID:", userProfile.restaurant_id);
      }

      return userProfile?.restaurant_id || null;
    },
  });

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    const userMessage: Message = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log("Calling chat-with-api function with messages:", [...messages, userMessage]);
      console.log("Using restaurant ID:", restaurantId);
      
      if (!restaurantId) {
        console.warn("Warning: No restaurant ID available. The chatbot won't be able to access restaurant-specific data.");
      }
      
      const { data, error } = await supabase.functions.invoke('chat-with-api', {
        body: { 
          messages: [...messages, userMessage].map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          restaurantId
        },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from function");
      }

      console.log("Response data:", data);
      
      // Extract the assistant message from the response
      const assistantMessage = data.choices?.[0]?.message;
      
      if (assistantMessage && assistantMessage.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage.content },
        ]);
      } else if (data.error) {
        throw new Error(`API error: ${data.error}`);
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("Error calling API:", error);
      
      // Show error message to user
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please check that the API keys are configured correctly in the Supabase Edge Function secrets." 
        },
      ]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Extract the base64 part (remove the data:*/*;base64, prefix)
            const base64Data = reader.result.split(',')[1];
            resolve(base64Data);
          } else {
            reject(new Error('Failed to read file as base64'));
          }
        };
        reader.onerror = reject;
      });

      toast({
        title: "Processing",
        description: `Uploading ${file.name}...`,
      });

      console.log(`Uploading file: ${file.name}, type: ${file.type}`);

      // Send file to upload-image function with additional metadata
      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: { 
          base64Image: base64,
          fileName: file.name,
          fileType: file.type
        },
      });

      if (error) {
        console.error("Supabase upload function error:", error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || "Failed to upload file";
        console.error("Upload failed:", errorMsg);
        throw new Error(errorMsg);
      }

      console.log("Upload response:", data);

      // Add message with uploaded file info
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let fileTypeDescription = '';
      
      if (fileExtension === 'csv') {
        fileTypeDescription = 'CSV';
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        fileTypeDescription = 'Excel';
      } else if (fileExtension === 'pdf') {
        fileTypeDescription = 'PDF';
      } else if (['ppt', 'pptx'].includes(fileExtension || '')) {
        fileTypeDescription = 'PowerPoint';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        fileTypeDescription = 'image';
      } else {
        fileTypeDescription = 'file';
      }

      setMessages(prev => [
        ...prev,
        { 
          role: "user", 
          content: `I've uploaded a ${fileTypeDescription} file named "${file.name}" for analysis.` 
        }
      ]);

      // Now send a message to the AI to analyze the file
      const imageUrl = data.image.url;
      
      setIsLoading(true);
      const analysisMessage = {
        role: "user" as const,
        content: `Please analyze this uploaded ${fileTypeDescription} file: ${file.name}. The file is available at ${imageUrl}. Provide insights and recommendations based on the file content.`
      };

      toast({
        title: "Analyzing",
        description: `Analyzing ${file.name}...`,
      });

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('chat-with-api', {
        body: { 
          messages: [...messages, 
            { role: "user", content: `I've uploaded a ${fileTypeDescription} file named "${file.name}" for analysis.` },
            analysisMessage
          ].map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          restaurantId // Pass the restaurant ID for context
        },
      });

      if (analysisError) {
        throw new Error(`Analysis error: ${analysisError.message}`);
      }

      if (!analysisData) {
        throw new Error("No analysis data returned");
      }

      const assistantMessage = analysisData.choices?.[0]?.message;
      
      if (assistantMessage && assistantMessage.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage.content },
        ]);
        
        toast({
          title: "Success",
          description: "Your file has been analyzed successfully.",
        });
      } else if (analysisData.error) {
        throw new Error(`Analysis error: ${analysisData.error}`);
      } else {
        throw new Error("Invalid analysis response format");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload and analyze file.",
        variant: "destructive",
      });
      
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I couldn't process your uploaded file. Please try again with a different file format (CSV, Excel, PDF, or image files work best)." 
        }
      ]);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    isUploading,
    handleSendMessage,
    handleFileUpload,
  };
};
