// "use client";

// import { draftEmail } from "@/ai/flows/draft-email";
// import { generateCallScript } from "@/ai/flows/generate-call-script";
// import EmailForm from "@/components/EmailForm";
// import { VoiceCommandButton } from "@/components/VoiceCommandButton";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { sendEmail } from "@/services/email";
// import { Mail, Phone } from "lucide-react";
// // import { placeCall } from "@/services/livekit";
// import { useState } from "react";

// export default function Home() {
//   const [prompt, setPrompt] = useState("");
//   const [emailDraft, setEmailDraft] = useState("");
//   const [callScript, setCallScript] = useState("");
//   const [recipient, setRecipient] = useState("");
//   const [isSendingEmail, setIsSendingEmail] = useState(false);
//   const [liveKitToken, setLiveKitToken] = useState<string | null>(null);

//   const handleDraftEmail = async () => {
//     const result = await draftEmail({ prompt });
//     setEmailDraft(result.emailDraft);
//   };

//   const handleGenerateCallScript = async () => {
//     const result = await generateCallScript({ topic: prompt });
//     setCallScript(result.script);
//   };

//   const handleSendEmail = async () => {
//     if (!recipient) {
//       alert("Please enter a recipient email address.");
//       return;
//     }
//     if (!emailDraft) {
//       alert("Please generate or write an email draft first.");
//       return;
//     }

//     setIsSendingEmail(true);

//     const lines = emailDraft.trim().split("\n");
//     let subject = "Email from Granteri";
//     let body = emailDraft;

//     if (lines.length > 1 && lines[0].toLowerCase().startsWith("subject:")) {
//       subject = lines[0].substring(8).trim();
//       body = lines.slice(1).join("\n").trim();
//     } else if (lines.length > 0 && !lines[0].includes("@") && lines[0].length < 100) {
//       subject = lines[0].trim();
//       body = lines.slice(1).join("\n").trim();
//     }

//     try {
//       const result = await sendEmail({ to: recipient, subject, body });
//       if (result.success) {
//         alert("Email sent successfully!");
//       } else {
//         alert(`Email sending failed: ${result.error || "Unknown error"}`);
//       }
//     } catch (error) {
//       console.error("Error sending email:", error);
//       alert("An unexpected error occurred while sending the email.");
//     } finally {
//       setIsSendingEmail(false);
//     }
//   };

//   // Function to fetch LiveKit token (returns string|null)
//   const handleGetLiveKitToken = async (): Promise<string | null> => {
//     try {
//       const username = `user-${Math.random().toString(36).substring(7)}`;
//       const room = "voice-command-room";
//       const url = new URL("http://127.0.0.1:8000/api/livekit-token/");
//       url.searchParams.append("username", username);
//       url.searchParams.append("room", room);

//       const response = await fetch(url.toString(), { method: "GET" });
//       if (!response.ok) {
//         throw new Error(`status: ${response.status}`);
//       }
//       const data = await response.json();
//       if (data.token) {
//         setLiveKitToken(data.token);
//         console.log("LiveKit token fetched successfully.");
//         return data.token;
//       } else {
//         console.error("Failed to get token from response:", data);
//         alert("Failed to get LiveKit token.");
//         setLiveKitToken(null);
//         return null;
//       }
//     } catch (error: any) {
//       console.error("Error fetching LiveKit token:", error);
//       alert(`Error fetching token: ${error.message}`);
//       setLiveKitToken(null);
//       return null;
//     }
//   };

//   return (
//     <div className="container">
//       <Card className="hover-card">
//         <CardHeader className="card-header">
//           <h1 className="granteri-title">
//             Granteri <span className="moon-icon">🌓</span>
//           </h1>
//           <p className="hero-description">
//             Draft emails and generate call scripts with Granteri 🌓.\nEnhance your communication
//             with AI-powered assistance.
//           </p>
//         </CardHeader>
//         <CardContent className="card-content">
//           <div className="input-group">
//             <Label htmlFor="prompt" className="input-label">
//               Prompt
//             </Label>
//             <Input
//               id="prompt"
//               placeholder="Describe what you want to create..."
//               value={prompt}
//               onChange={(e) => setPrompt(e.target.value)}
//               className="shine-placeholder"
//             />
//           </div>
//           <div className="btn-group">
//             <Button onClick={handleDraftEmail} className="btn btn-primary">
//               Draft Email
//             </Button>
//             <Button onClick={handleGenerateCallScript} className="btn btn-secondary">
//               Generate Call Script
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8">
//         {/* Left side: Email Form */}
//         <div className="w-full md:w-1/2">
//           <EmailForm initialEmailDraft={emailDraft} />
//           {/* Pass the token fetching function */}
//           <VoiceCommandButton onGetToken={handleGetLiveKitToken} />
//         </div>

//         {/* Right side: Call Section */}
//         <div className="w-full md:w-1/2">
//           <Card className="hover-card">
//             <CardHeader>
//               <h2 className="section-header">Call Script</h2>
//               <p className="section-description">View the generated call script.</p>
//             </CardHeader>
//             <CardContent className="card-content">
//               <div className="input-group">
//                 <Label htmlFor="call-script" className="input-label">
//                   Call Script
//                 </Label>
//                 <div className="gradient-border">
//                   <Textarea
//                     id="call-script"
//                     value={callScript}
//                     onChange={(e) => setCallScript(e.target.value)}
//                     placeholder="Your generated call script will appear here..."
//                     className="shine-placeholder"
//                   />
//                 </div>
//               </div>
//               {/* Place Call button removed since handlePlaceCall doesn't exist */}
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }
