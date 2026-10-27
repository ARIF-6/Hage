import React, { useState } from 'react';
import { MapPin, Mail, MessageSquare, CheckCircle2, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: localStorage.getItem('profile_firstName') || '',
    lastName: localStorage.getItem('profile_lastName') || '',
    email: localStorage.getItem('profile_email') || '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!formData.message.trim()) {
      setError('Please enter a message before sending.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
        title: formData.firstName.trim() 
          ? `Contact from ${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
          : 'Website Contact Inquiry',
        description: formData.message.trim(),
        category: 'Contact Form',
        source: 'contact'
      };

      await axios.post(`${API_BASE}/support`, payload, { headers });

      setSuccess(true);
      setFormData(prev => ({
        ...prev,
        message: ''
      }));
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setError(
        err.response?.data?.message || 
        'Could not send message. Please check your internet connection or email us directly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 bg-gray-50 dark:bg-[#0B0E14] min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Get in touch</h1>
          <p className="text-lg text-gray-600 dark:text-slate-300">
            Have questions about HAGE? We're here to help. Reach out to our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
          {/* Form Card */}
          <div>
            <Card className="p-8 border-gray-200 dark:border-slate-800 shadow-xl bg-white dark:bg-[#0E131F]">
              {success ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 max-w-sm mx-auto">
                    Thank you{formData.firstName ? ` ${formData.firstName}` : ''}. We have received your message and our team will get back to you shortly.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSuccess(false)}
                    className="mt-4"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label="First Name" 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter your first name" 
                    />
                    <Input 
                      label="Last Name" 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter your last name" 
                    />
                  </div>

                  <Input 
                    label="Email" 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email" 
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </Card>
          </div>

          {/* Contact Details Info */}
          <div className="space-y-8 lg:pl-8 flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 dark:bg-blue-950/60 p-3 rounded-xl text-primary dark:text-blue-400 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Email us</h3>
                <p className="text-gray-600 dark:text-slate-400 mt-1">Our friendly team is here to help.</p>
                <a href="mailto:support@hagetrading.com" className="text-primary dark:text-blue-400 font-medium mt-2 inline-block hover:underline">
                  support@hagetrading.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 dark:bg-blue-950/60 p-3 rounded-xl text-primary dark:text-blue-400 shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Live chat</h3>
                <p className="text-gray-600 dark:text-slate-400 mt-1">Chat with our team in real-time.</p>
                <p className="text-primary dark:text-blue-400 font-medium mt-2">Available 24/7</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 dark:bg-blue-950/60 p-3 rounded-xl text-primary dark:text-blue-400 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Office</h3>
                <p className="text-gray-600 dark:text-slate-400 mt-1">Come say hello at our office HQ.</p>
                <p className="text-primary dark:text-blue-400 font-medium mt-2">100 Trading Way<br />New York, NY 10001</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
