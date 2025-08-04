// @ts-ignore
'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { AuthModal } from '@/components/auth/AuthModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ImageUpload } from './ImageUpload'
import { PaymentModal } from './PaymentModal'
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react'
import { useAuthModal } from "@/providers/AuthModalProvider"

// Debounce utility function
const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

interface FormData {
    token: string
    token_symbol: string
    token_address: string
    relationship_to_token: 'creator' | 'community'
    token_image: File | null
    description_about_token: string
    lore_content: string
    telegram_handle: string
    email: string
    x_url: string
    dexscreener_url: string
    is_fasttrack: boolean
}

interface FormErrors {
    [key: string]: string
}

export function SubmitLoreForm() {
    // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
    const { isAuthenticated, isLoreCreator, isLoading, user } = useAuth()
    const { openModal } = useAuthModal()
    const router = useRouter()
    const fastTrackPrice = Number(process.env.NEXT_PUBLIC_FASTTRACK_PRICE) || 0.1
    const [formData, setFormData] = useState<FormData>({
        token: '',
        token_symbol: '',
        token_address: '',
        relationship_to_token: 'community',
        token_image: null,
        description_about_token: '',
        lore_content: '',
        telegram_handle: '',
        email: '',
        x_url: '',
        dexscreener_url: '',
        is_fasttrack: false
    })

    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    // Enhanced token validation state for name and symbol only
    const [tokenValidation, setTokenValidation] = useState<{
        name: { isChecking: boolean; isValid: boolean; message: string; };
        symbol: { isChecking: boolean; isValid: boolean; message: string; };
        overall: { isValid: boolean; message: string; };
    }>({
        name: { isChecking: false, isValid: true, message: '' },
        symbol: { isChecking: false, isValid: true, message: '' },
        overall: { isValid: true, message: '' }
    });

    // Comprehensive validation function
    const validateTokenFields = useCallback(
        debounce(async (name: string, symbol: string, address: string) => {
            // Skip validation if all fields are empty
            if (!name.trim() && !symbol.trim()) {
                setTokenValidation({
                    name: { isChecking: false, isValid: true, message: '' },
                    symbol: { isChecking: false, isValid: true, message: '' },
                    overall: { isValid: true, message: '' }
                });
                return;
            }

            // Set checking state for fields that have values
            setTokenValidation(prev => ({
                ...prev,
                name: name.trim() ? { ...prev.name, isChecking: true } : prev.name,
                symbol: symbol.trim() ? { ...prev.symbol, isChecking: true } : prev.symbol
            }));

            try {
                const params = new URLSearchParams();
                if (name.trim()) params.append('name', name.trim());
                if (symbol.trim()) params.append('symbol', symbol.trim());

                const response = await fetch(`/api/validate-token?${params.toString()}`);
                const data = await response.json();

                console.log('🔍 [FORM VALIDATION] API Response:', data);

                setTokenValidation({
                    name: {
                        isChecking: false,
                        isValid: name.trim() ? data.details?.name?.available ?? true : true,
                        message: name.trim() && !data.details?.name?.available
                            ? (data.details.name.exists ? 'Name already exists' : 'Name already submitted')
                            : ''
                    },
                    symbol: {
                        isChecking: false,
                        isValid: symbol.trim() ? data.details?.symbol?.available ?? true : true,
                        message: symbol.trim() && !data.details?.symbol?.available
                            ? (data.details.symbol.exists ? 'Symbol already exists' : 'Symbol already submitted')
                            : ''
                    },
                    overall: {
                        isValid: data.available,
                        message: data.message
                    }
                });
            } catch (error) {
                console.error('🔍 [FORM VALIDATION] Error:', error);
                setTokenValidation({
                    name: { isChecking: false, isValid: true, message: 'Unable to validate' },
                    symbol: { isChecking: false, isValid: true, message: 'Unable to validate' },
                    overall: { isValid: true, message: 'Validation temporarily unavailable' }
                });
            }
        }, 800),
        []
    );

    // Individual field validation triggers
    const validateTokenName = useCallback((name: string) => {
        validateTokenFields(name, formData.token_symbol, '');
    }, [formData.token_symbol, validateTokenFields]);

    const validateTokenSymbol = useCallback((symbol: string) => {
        validateTokenFields(formData.token, symbol, '');
    }, [formData.token, validateTokenFields]);

    // NOW conditional logic and early returns are safe
    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Checking permissions...</p>
                </div>
            </div>
        )
    }

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        if (!formData.token.trim()) {
            newErrors.token = 'Token name is required'
        }

        if (!formData.token_symbol.trim()) {
            newErrors.token_symbol = 'Token symbol is required'
        }

        if (!formData.token_address.trim()) {
            newErrors.token_address = 'Token address is required'
        }

        // Add validation for relationship_to_token
        if (!formData.relationship_to_token) {
            newErrors.relationship_to_token = 'Please select your relationship to the token'
        }

        if (!formData.description_about_token.trim()) {
            newErrors.description_about_token = 'Token description is required'
        }

        if (!formData.lore_content.trim()) {
            newErrors.lore_content = 'Token lore story is required'
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format'
        }

        if (formData.telegram_handle && !formData.telegram_handle.startsWith('@')) {
            newErrors.telegram_handle = 'Telegram username should start with @'
        }

        if (formData.x_url && !formData.x_url.startsWith('https://twitter.com/') && !formData.x_url.startsWith('https://x.com/')) {
            newErrors.x_url = 'Invalid Twitter/X URL format'
        }

        if (formData.dexscreener_url && !formData.dexscreener_url.startsWith('https://dexscreener.com/')) {
            newErrors.dexscreener_url = 'Invalid Dexscreener URL format'
        }

        console.log('Validation errors:', newErrors); // Debug log
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const handleImageUpload = (file: File | null) => {
        setFormData(prev => ({ ...prev, token_image: file }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Check authentication first
        if (!isAuthenticated) {
            openModal()
            return
        }

        // Check role permission using the env variable
        if (!isLoreCreator) {
            setErrors({
                submit: `You need the "Lore Creator" role to submit token lore. Please contact an administrator. Required Role ID: ${process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID}`
            })
            return
        }

        if (!validateForm()) {
            return
        }

        // Debug: Log the current form data
        console.log('Form data before submission:', formData);
        console.log('Relationship to token:', formData.relationship_to_token);

        // If fast-track is selected, show payment modal
        if (formData.is_fasttrack) {
            console.log('Fast-track selected - showing payment modal');
            setShowPaymentModal(true)
            return
        }

        // For free submissions, submit directly
        console.log('Free submission - submitting directly');
        await submitLore()
    }

    // Token name change handler
    const handleTokenNameChange = (value: string) => {
        handleInputChange('token', value);
        validateTokenName(value);
    };

    const submitLore = async (paymentId?: string) => {
        setIsSubmitting(true)

        try {
            const formDataToSend = new FormData()

            // Add all form fields
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'token_image' && value instanceof File) {
                    formDataToSend.append(key, value)
                } else if (typeof value === 'string') {
                    formDataToSend.append(key, value)
                } else if (typeof value === 'boolean') {
                    // Skip boolean values here - handle them separately
                    return
                }
            })

            if (paymentId) {
                formDataToSend.append('fasttrack_payment_id', paymentId)
            }

            // Add fast-track status
            formDataToSend.append('is_fasttrack', formData.is_fasttrack.toString())

            // Debug: Log form data being sent
            console.log('🔍 DEBUG: Submitting form data:');
            console.log('🔍 DEBUG: relationship_to_token from state:', formData.relationship_to_token);
            for (let [key, value] of formDataToSend.entries()) {
                console.log(`🔍 DEBUG: FormData[${key}] =`, value);
            }

            const response = await fetch('/api/lore', {
                method: 'POST',
                body: formDataToSend,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to submit lore')
            }

            const result = await response.json()
            console.log('Submission successful:', result);

            // Redirect to thank you page instead of token page
            router.push('/submit-lore/thank-you')

        } catch (error) {
            console.error('Error submitting lore:', error)
            setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit lore. Please try again.' })
        } finally {
            setIsSubmitting(false)
            setShowPaymentModal(false)
        }
    }

    const handlePaymentSuccess = (paymentId: string) => {
        submitLore(paymentId)
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </button>

                    <h1 className="text-3xl font-bold text-center text-blue-400 mb-8">
                        Submit Your Token's Lore
                    </h1>
                </div>

                {/* Authentication Check */}
                {!isAuthenticated && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 text-center">
                        <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Sign In Required
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Please sign in to submit your token's lore and join the community.
                        </p>
                        <Button
                            onClick={openModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium"
                        >
                            Sign In to Continue
                        </Button>
                    </div>
                )}

                {/* Role Check */}
                {isAuthenticated && !isLoreCreator && (
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 mb-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Permission Required
                        </h2>
                        <p className="text-gray-300 mb-4">
                            You need the "Lore Creator" role to submit token lore.
                        </p>
                        <p className="text-sm text-gray-400 mb-4">
                            Please contact an administrator to request access.
                        </p>

                        {/* Debug Information */}
                        <div className="bg-gray-800 rounded-lg p-4 text-left">
                            <p className="text-xs text-gray-500 font-mono mb-2">
                                <strong>Required Role ID:</strong> {process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID}
                            </p>
                            {user?.directus_role_id && (
                                <p className="text-xs text-gray-500 font-mono">
                                    <strong>Your Role ID:</strong> {user.directus_role_id}
                                </p>
                            )}
                            {!user?.directus_role_id && (
                                <p className="text-xs text-orange-400">
                                    <strong>Note:</strong> No role ID found in your session. Please contact support.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Form - Only show if authenticated and has correct role */}
                {isAuthenticated && isLoreCreator && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <p className="text-green-400 font-medium">✓ Authorized to submit lore</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Token Name */}
                            <div>
                                <Label htmlFor="token" className="text-gray-300 mb-2 block">
                                    Token Name *
                                </Label>
                                <Input
                                    id="token"
                                    placeholder="e.g. Dogecoin"
                                    value={formData.token}
                                    onChange={(e) => handleTokenNameChange(e.target.value)}
                                    className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 ${!tokenValidation.name.isValid ? 'border-red-500' : ''
                                        }`}
                                />
                                {tokenValidation.name.isChecking && (
                                    <p className="text-blue-400 text-sm mt-1">Checking name availability...</p>
                                )}
                                {!tokenValidation.name.isValid && tokenValidation.name.message && (
                                    <p className="text-red-400 text-sm mt-1">{tokenValidation.name.message}</p>
                                )}
                                {tokenValidation.name.isValid && formData.token && !tokenValidation.name.isChecking && (
                                    <p className="text-green-400 text-sm mt-1">✓ Token name is available</p>
                                )}
                                {errors.token && (
                                    <p className="text-red-400 text-sm mt-1">{errors.token}</p>
                                )}
                            </div>

                            {/* Token Symbol */}
                            <div>
                                <Label htmlFor="token_symbol" className="text-gray-300 mb-2 block">
                                    Token Symbol *
                                </Label>
                                <Input
                                    id="token_symbol"
                                    placeholder="e.g. $DOGE"
                                    value={formData.token_symbol}
                                    onChange={(e) => {
                                        handleInputChange('token_symbol', e.target.value);
                                        validateTokenSymbol(e.target.value);
                                    }}
                                    className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 ${!tokenValidation.symbol.isValid ? 'border-red-500' : ''}`}
                                />
                                {tokenValidation.symbol.isChecking && (
                                    <p className="text-blue-400 text-sm mt-1">Checking symbol availability...</p>
                                )}
                                {!tokenValidation.symbol.isValid && tokenValidation.symbol.message && (
                                    <p className="text-red-400 text-sm mt-1">{tokenValidation.symbol.message}</p>
                                )}
                                {tokenValidation.symbol.isValid && formData.token_symbol && !tokenValidation.symbol.isChecking && (
                                    <p className="text-green-400 text-sm mt-1">✓ Token symbol is available</p>
                                )}
                                {errors.token_symbol && (
                                    <p className="text-red-400 text-sm mt-1">{errors.token_symbol}</p>
                                )}
                            </div>

                            {/* Token Address */}
                            <div>
                                <Label htmlFor="token_address" className="text-gray-300 mb-2 block">
                                    Token Address *
                                </Label>
                                <Input
                                    id="token_address"
                                    placeholder="0x..."
                                    value={formData.token_address}
                                    onChange={(e) => {
                                        handleInputChange('token_address', e.target.value);
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 font-mono"
                                />
                                {errors.token_address && (
                                    <p className="text-red-400 text-sm mt-1">{errors.token_address}</p>
                                )}
                            </div>

                            {/* Relationship to Token */}
                            <div>
                                <Label className="text-gray-300 mb-4 block">
                                    Your Relationship to Token *
                                </Label>
                                <RadioGroup
                                    value={formData.relationship_to_token}
                                    onValueChange={(value) => {
                                        console.log('Radio value changed:', value); // Debug log
                                        setFormData(prev => ({ ...prev, relationship_to_token: value as 'creator' | 'community' }));
                                        // Clear any existing errors for this field
                                        if (errors.relationship_to_token) {
                                            setErrors(prev => ({ ...prev, relationship_to_token: '' }));
                                        }
                                    }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center space-x-3 p-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors">
                                        <RadioGroupItem
                                            value="creator"
                                            id="creator"
                                            className="border-gray-600 text-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor="creator" className="text-gray-300 font-medium cursor-pointer">
                                                Creator/Developer
                                            </Label>
                                            <p className="text-sm text-gray-400">
                                                Official token representative
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors">
                                        <RadioGroupItem
                                            value="community"
                                            id="community"
                                            className="border-gray-600 text-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor="community" className="text-gray-300 font-medium cursor-pointer">
                                                Community Member
                                            </Label>
                                            <p className="text-sm text-gray-400">
                                                Community contributor
                                            </p>
                                        </div>
                                    </div>
                                </RadioGroup>
                                {errors.relationship_to_token && (
                                    <p className="text-red-400 text-sm mt-1">{errors.relationship_to_token}</p>
                                )}
                            </div>

                            {/* Fast-Track Option */}
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <input
                                        type="checkbox"
                                        id="fasttrack"
                                        checked={formData.is_fasttrack}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, is_fasttrack: e.target.checked }));
                                        }}
                                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="fasttrack" className="text-gray-300 font-medium cursor-pointer">
                                            Fast-Track Processing (${fastTrackPrice} USD)
                                        </Label>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Get expedited review and social media promotion for your submission
                                        </p>
                                        <div className="mt-2 text-xs text-blue-300">
                                            <p>✓ Priority review within 24 hours</p>
                                            <p>✓ Social media promotion across our channels</p>
                                            <p>✓ Featured placement consideration</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Token Image */}
                            <div>
                                <Label className="text-gray-300 mb-4 block">
                                    Token Image
                                </Label>
                                <ImageUpload onImageUpload={handleImageUpload} />
                            </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="description" className="text-gray-300 mb-2 block">
                                    Description about your token *
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Provide a brief description of your token..."
                                    value={formData.description_about_token}
                                    onChange={(e) => handleInputChange('description_about_token', e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[100px] focus:border-blue-500"
                                />
                                {errors.description_about_token && (
                                    <p className="text-red-400 text-sm mt-1">{errors.description_about_token}</p>
                                )}
                            </div>

                            {/* Lore Story */}
                            <div>
                                <Label htmlFor="lore_content" className="text-gray-300 mb-2 block">
                                    The story behind your token lore *
                                </Label>
                                <Textarea
                                    id="lore_content"
                                    placeholder="Share the full story and vision behind your token..."
                                    value={formData.lore_content}
                                    onChange={(e) => handleInputChange('lore_content', e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[150px] focus:border-blue-500"
                                />
                                {errors.lore_content && (
                                    <p className="text-red-400 text-sm mt-1">{errors.lore_content}</p>
                                )}
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="telegram" className="text-gray-300 mb-2 block">
                                        Your Telegram
                                    </Label>
                                    <Input
                                        id="telegram"
                                        placeholder="@yourusername"
                                        value={formData.telegram_handle}
                                        onChange={(e) => handleInputChange('telegram_handle', e.target.value)}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                    />
                                    {errors.telegram_handle && (
                                        <p className="text-red-400 text-sm mt-1">{errors.telegram_handle}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="email" className="text-gray-300 mb-2 block">
                                        Your Email *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                    />
                                    {errors.email && (
                                        <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="x_url" className="text-gray-300 mb-2 block">
                                        Twitter URL (Optional)
                                    </Label>
                                    <Input
                                        id="x_url"
                                        placeholder="https://twitter.com/yourusername"
                                        value={formData.x_url}
                                        onChange={(e) => handleInputChange('x_url', e.target.value)}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                    />
                                    {errors.x_url && (
                                        <p className="text-red-400 text-sm mt-1">{errors.x_url}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="dexscreener_url" className="text-gray-300 mb-2 block">
                                        Dexscreener URL (Optional)
                                    </Label>
                                    <Input
                                        id="dexscreener_url"
                                        placeholder="https://dexscreener.com/ethereum/0x..."
                                        value={formData.dexscreener_url}
                                        onChange={(e) => handleInputChange('dexscreener_url', e.target.value)}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                    />
                                    {errors.dexscreener_url && (
                                        <p className="text-red-400 text-sm mt-1">{errors.dexscreener_url}</p>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-6 border-t border-gray-700">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 text-lg font-semibold transition-colors"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Submitting...
                                        </div>
                                    ) : formData.is_fasttrack ? (
                                        `Submit Lore with Fast-Track ($${fastTrackPrice})`
                                    ) : (
                                        'Submit Lore (Free)'
                                    )}
                                </Button>

                                {formData.is_fasttrack && (
                                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                                        <p className="text-sm text-blue-300 text-center">
                                            💰 Fast-Track processing requires a ${fastTrackPrice} payment
                                        </p>
                                    </div>
                                )}

                                {!formData.is_fasttrack && (
                                    <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                                        <p className="text-sm text-green-300 text-center">
                                            🆓 Free submission - no payment required
                                        </p>
                                    </div>
                                )}

                                {errors.submit && (
                                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                                        <p className="text-red-400 text-sm text-center">{errors.submit}</p>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* Payment Modal */}
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                    amount={fastTrackPrice}
                    currency="USD"
                />
            </div>
        </div>
    )
}
