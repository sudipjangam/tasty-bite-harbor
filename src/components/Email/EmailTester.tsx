import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmail } from "@/hooks/useEmail";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";

export function EmailTester() {
  const { sendEmail, sendLoyaltyInvitation, sendWelcomeEmail, isSending } =
    useEmail();
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState<
    "loyalty_invitation" | "welcome" | "custom"
  >("loyalty_invitation");
  const [customerName, setCustomerName] = useState("Test Customer");
  const [customSubject, setCustomSubject] = useState("");
  const [customHtml, setCustomHtml] = useState(
    "<h1>Hello!</h1><p>This is a test email.</p>"
  );
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSend = async () => {
    setLastResult(null);

    if (!email) {
      setLastResult({
        success: false,
        message: "Please enter an email address",
      });
      return;
    }

    let result;

    switch (template) {
      case "loyalty_invitation":
        result = await sendLoyaltyInvitation(
          email,
          customerName,
          `${window.location.origin}/enroll/test-restaurant`
        );
        break;

      case "welcome":
        result = await sendWelcomeEmail(email, customerName, 100, "Bronze");
        break;

      case "custom":
        result = await sendEmail({
          to: email,
          subject: customSubject || "Test Email",
          html: customHtml,
          template: "custom",
        });
        break;
    }

    if (result.success) {
      setLastResult({
        success: true,
        message: `Email sent! ID: ${result.emailId}`,
      });
    } else {
      setLastResult({
        success: false,
        message: result.error || "Failed to send",
      });
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-purple-600" />
          Email Service Tester
        </CardTitle>
        <CardDescription>Test the email sending functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Recipient Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Email Template</Label>
          <Select value={template} onValueChange={(v: any) => setTemplate(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loyalty_invitation">
                Loyalty Invitation
              </SelectItem>
              <SelectItem value="welcome">Welcome Email</SelectItem>
              <SelectItem value="custom">Custom Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(template === "loyalty_invitation" || template === "welcome") && (
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        )}

        {template === "custom" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="html">HTML Content</Label>
              <Textarea
                id="html"
                placeholder="<h1>Hello!</h1>"
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                rows={4}
              />
            </div>
          </>
        )}

        <Button
          onClick={handleSend}
          disabled={isSending || !email}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test Email
            </>
          )}
        </Button>

        {lastResult && (
          <div
            className={`p-4 rounded-lg ${
              lastResult.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {lastResult.success && <CheckCircle className="h-4 w-4" />}
              <span className="text-sm">{lastResult.message}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmailTester;
