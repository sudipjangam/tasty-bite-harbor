import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

type EmailTemplate = 'loyalty_invitation' | 'welcome' | 'custom';

interface SendEmailParams {
  to: string;
  subject?: string;
  html?: string;
  template?: EmailTemplate;
  templateData?: Record<string, any>;
  fromName?: string;
}

interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export function useEmail() {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  /**
   * Send an email using the send-email edge function
   */
  const sendEmail = async (params: SendEmailParams): Promise<SendEmailResult> => {
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          subject: params.subject,
          html: params.html,
          template: params.template,
          templateData: params.templateData,
          restaurantId: user?.restaurant_id,
          fromName: params.fromName,
        },
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: "Failed to send email",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        toast({
          title: "Failed to send email",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
        return { success: false, error: data?.error };
      }

      toast({
        title: "Email sent!",
        description: `Email sent successfully to ${params.to}`,
      });

      return { success: true, emailId: data.emailId };
    } catch (err) {
      console.error('Unexpected error sending email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: "Failed to send email",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Send a loyalty program invitation email
   */
  const sendLoyaltyInvitation = async (
    email: string, 
    customerName: string, 
    enrollmentLink: string,
    benefits?: string[]
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to: email,
      template: 'loyalty_invitation',
      templateData: {
        customerName,
        enrollmentLink,
        benefits,
      },
    });
  };

  /**
   * Send a welcome email after enrollment
   */
  const sendWelcomeEmail = async (
    email: string,
    customerName: string,
    loyaltyPoints: number,
    tier: string
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to: email,
      template: 'welcome',
      templateData: {
        customerName,
        loyaltyPoints,
        tier,
      },
    });
  };

  /**
   * Send a custom email with HTML content
   */
  const sendCustomEmail = async (
    email: string,
    subject: string,
    htmlContent: string
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to: email,
      subject,
      html: htmlContent,
      template: 'custom',
    });
  };

  /**
   * Send bulk emails (one by one with rate limiting)
   */
  const sendBulkEmails = async (
    emails: SendEmailParams[],
    delayMs: number = 500
  ): Promise<{ successful: number; failed: number; errors: string[] }> => {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const result = await sendEmail(email);
      if (result.success) {
        successful++;
      } else {
        failed++;
        errors.push(`${email.to}: ${result.error}`);
      }
      
      // Delay between emails to respect rate limits
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Summary toast
    toast({
      title: "Bulk email complete",
      description: `Sent: ${successful}, Failed: ${failed}`,
      variant: failed > 0 ? "destructive" : "default",
    });

    return { successful, failed, errors };
  };

  return {
    sendEmail,
    sendLoyaltyInvitation,
    sendWelcomeEmail,
    sendCustomEmail,
    sendBulkEmails,
    isSending,
  };
}

export default useEmail;
