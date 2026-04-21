import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Mail, CheckCircle2 } from "lucide-react";

export default function EmailVerification() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TNA System</h1>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-10 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
            <p className="text-gray-500 mb-2 text-sm">
              We've sent a verification link to your email address.
            </p>
            <p className="text-gray-500 mb-6 text-sm">
              Please check your inbox and click the link to verify your account.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                Resend Verification Email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-blue-600">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
