'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Flashcard, FlashcardType } from '@/models/Lesson';
import { IoAdd, IoClose, IoArrowBack, IoHome } from 'react-icons/io5';
import Link from 'next/link';

interface LessonForm {
    title: string;
    description: string;
    flashcards: Flashcard[];
    visibility: 'public' | 'private';
}

const EditFlashcardPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.id as string;
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState<{ [key: number]: boolean }>({});
    const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});

    const [formData, setFormData] = useState<LessonForm>({
        title: '',
        description: '',
        flashcards: [],
        visibility: 'private'
    });

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch(`/api/flashcards/${slug}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const lesson = await response.json();
                    setFormData({
                        title: lesson.title,
                        description: lesson.description,
                        visibility: lesson.visibility || 'private',
                        flashcards: lesson.flashcards.map((flashcard: Flashcard) => ({
                            ...flashcard,
                            options: flashcard.type === 'multipleChoice' ? (flashcard as any).options : [],
                            correctOption: flashcard.type === 'multipleChoice' ? (flashcard as any).correctOption : '',
                            imageUrl: flashcard.type === 'image' ? (flashcard as any).imageUrl : '',
                            audioUrl: flashcard.type === 'audio' ? (flashcard as any).audioUrl : ''
                        }))
                    });
                } else {
                    throw new Error('Failed to fetch lesson');
                }
            } catch (error) {
                console.error('Error fetching lesson:', error);
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLesson();
    }, [slug, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFlashcardChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const updatedFlashcards = [...prev.flashcards];
            updatedFlashcards[index] = {
                ...updatedFlashcards[index],
                [field]: value
            };
            return {
                ...prev,
                flashcards: updatedFlashcards
            };
        });
    };

    const handleTypeChange = (index: number, type: FlashcardType) => {
        setFormData(prev => {
            const updatedFlashcards = [...prev.flashcards];
            const currentContent = {
                front: updatedFlashcards[index].front,
                back: updatedFlashcards[index].back
            };
            updatedFlashcards[index] = {
                ...createEmptyFlashcard(),
                ...currentContent,
                type
            } as Flashcard;
            return {
                ...prev,
                flashcards: updatedFlashcards
            };
        });
    };

    function createEmptyFlashcard(): Flashcard {
        return {
            type: 'text' as FlashcardType,
            front: '',
            back: '',
            options: [],
            correctOption: '',
            imageUrl: '',
            audioUrl: ''
        } as Flashcard;
    }

    const addOption = (flashcardIndex: number) => {
        setFormData(prev => {
            const updatedFlashcards = [...prev.flashcards];
            const flashcard = updatedFlashcards[flashcardIndex] as any;
            flashcard.options = [...(flashcard.options || []), ''];
            return {
                ...prev,
                flashcards: updatedFlashcards
            };
        });
    };

    const handleOptionChange = (flashcardIndex: number, optionIndex: number, value: string) => {
        setFormData(prev => {
            const updatedFlashcards = [...prev.flashcards];
            const flashcard = updatedFlashcards[flashcardIndex] as any;
            flashcard.options[optionIndex] = value;
            return {
                ...prev,
                flashcards: updatedFlashcards
            };
        });
    };

    const removeOption = (flashcardIndex: number, optionIndex: number) => {
        setFormData(prev => {
            const updatedFlashcards = [...prev.flashcards];
            const flashcard = updatedFlashcards[flashcardIndex] as any;
            flashcard.options = flashcard.options.filter((_: any, i: number) => i !== optionIndex);
            return {
                ...prev,
                flashcards: updatedFlashcards
            };
        });
    };

    const handleFileUpload = async (index: number, file: File, fileType: 'image' | 'audio') => {
        try {
            setUploadingFiles(prev => ({ ...prev, [index]: true }));
            if (fileType === 'image') {
                setImageLoading(prev => ({ ...prev, [index]: true }));
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            handleFlashcardChange(index, fileType === 'image' ? 'imageUrl' : 'audioUrl', data.url);
        } catch (error) {
            console.error(`Error uploading ${fileType}:`, error);
        } finally {
            setUploadingFiles(prev => ({ ...prev, [index]: false }));
        }
    };

    const addFlashcard = () => {
        setFormData(prev => ({
            ...prev,
            flashcards: [...prev.flashcards, createEmptyFlashcard()]
        }));
    };

    const removeFlashcard = (index: number) => {
        setFormData(prev => ({
            ...prev,
            flashcards: prev.flashcards.filter((_, i) => i !== index)
        }));
    };

    // Import renderFlashcardFields from create page
    const renderFlashcardFields = (flashcard: Flashcard, index: number) => {
        switch (flashcard.type) {
            case 'image':
                return (
                    <>
                        <div>
                            <label className="block mb-1">Image</label>
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    //@ts-ignore
                                    ref={(el) => fileInputRefs.current[index] = el}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleFileUpload(index, file, 'image');
                                        }
                                    }}
                                />
                                <div className="flex gap-4 items-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[index]?.click()}
                                        disabled={uploadingFiles[index]}
                                        className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {uploadingFiles[index] ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            'Choose Image'
                                        )}
                                    </button>
                                    {flashcard.imageUrl && (
                                        <div className="relative w-24 h-24 bg-gray-100 rounded-md">
                                            {(imageLoading[index] || uploadingFiles[index]) && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <img
                                                src={flashcard.imageUrl}
                                                alt="Uploaded preview"
                                                className={`w-full h-full object-cover rounded-md transition-opacity duration-200 ${
                                                    imageLoading[index] ? 'opacity-0' : 'opacity-100'
                                                }`}
                                                onLoad={() => setImageLoading(prev => ({ ...prev, [index]: false }))}
                                                onError={() => {
                                                    setImageLoading(prev => ({ ...prev, [index]: false }));
                                                    console.error('Error loading image');
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleFlashcardChange(index, 'imageUrl', '');
                                                    setImageLoading(prev => ({ ...prev, [index]: false }));
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                            >
                                                <IoClose size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!flashcard.imageUrl && (
                                    <input
                                        type="url"
                                        placeholder="Or paste image URL"
                                        value={flashcard.imageUrl}
                                        onChange={(e) => handleFlashcardChange(index, 'imageUrl', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1">Description</label>
                            <input
                                type="text"
                                value={flashcard.front}
                                onChange={(e) => handleFlashcardChange(index, 'front', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Answer</label>
                            <input
                                type="text"
                                value={flashcard.back}
                                onChange={(e) => handleFlashcardChange(index, 'back', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </>
                );

            case 'multipleChoice':
                return (
                    <>
                        <div>
                            <label className="block mb-1">Question</label>
                            <input
                                type="text"
                                value={flashcard.front}
                                onChange={(e) => handleFlashcardChange(index, 'front', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Answer</label>
                            <input
                                type="text"
                                value={flashcard.back}
                                onChange={(e) => handleFlashcardChange(index, 'back', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block mb-1">Options</label>
                            {(flashcard as any).options.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                        className="flex-1 p-2 border rounded"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index, optionIndex)}
                                        className="p-2 text-red-500"
                                    >
                                        <IoClose />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addOption(index)}
                                className="w-full p-2 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 text-gray-600"
                            >
                                Add Option
                            </button>
                        </div>
                        <div>
                            <label className="block mb-1">Correct Option</label>
                            <select
                                value={(flashcard as any).correctOption}
                                onChange={(e) => handleFlashcardChange(index, 'correctOption', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Select correct option</option>
                                {(flashcard as any).options.map((option: string, i: number) => (
                                    <option key={i} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </>
                );

            case 'audio':
                return (
                    <>
                        <div>
                            <label className="block mb-1">Audio File</label>
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    //@ts-ignore
                                    ref={(el) => fileInputRefs.current[index] = el}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleFileUpload(index, file, 'audio');
                                        }
                                    }}
                                />
                                <div className="flex gap-4 items-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[index]?.click()}
                                        disabled={uploadingFiles[index]}
                                        className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {uploadingFiles[index] ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            'Choose Audio File'
                                        )}
                                    </button>
                                    {flashcard.audioUrl && (
                                        <div className="flex items-center gap-2">
                                            <audio 
                                                controls 
                                                src={flashcard.audioUrl}
                                                className="h-8"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleFlashcardChange(index, 'audioUrl', '')}
                                                className="p-1 bg-red-500 text-white rounded-full"
                                            >
                                                <IoClose size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!flashcard.audioUrl && (
                                    <input
                                        type="url"
                                        placeholder="Or paste audio URL"
                                        value={flashcard.audioUrl}
                                        onChange={(e) => handleFlashcardChange(index, 'audioUrl', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1">Description</label>
                            <input
                                type="text"
                                value={flashcard.front}
                                onChange={(e) => handleFlashcardChange(index, 'front', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Answer</label>
                            <input
                                type="text"
                                value={flashcard.back}
                                onChange={(e) => handleFlashcardChange(index, 'back', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </>
                );

            default: // text
                return (
                    <>
                        <div>
                            <label className="block mb-1">Front (English)</label>
                            <input
                                type="text"
                                value={flashcard.front}
                                onChange={(e) => handleFlashcardChange(index, 'front', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Back (Vietnamese)</label>
                            <input
                                type="text"
                                value={flashcard.back}
                                onChange={(e) => handleFlashcardChange(index, 'back', e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </>
                );
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/flashcards', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    slug
                }),
            });

            if (response.ok) {
                router.push('/');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update lesson');
            }
        } catch (error) {
            console.error('Error updating lesson:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if(isLoading){
        return <div className="min-h-screen flex justify-center items-center">
            <div className='loader'></div>
        </div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Edit Lesson</h1>
                <div className="space-x-2">
                    <Link
                        href={`/flashcards/${slug}`}
                        className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md inline-flex items-center gap-2"
                    >
                        <IoArrowBack /> Back to Lesson
                    </Link>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded-md inline-flex items-center gap-2"
                    >
                        <IoHome /> Back to Home
                    </Link>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block mb-2">Title</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block mb-2">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        rows={3}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="visibility" className="block mb-2">Visibility</label>
                    <select
                        id="visibility"
                        name="visibility"
                        value={formData.visibility}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    >
                        <option value="private">Private - Only you can see this</option>
                        <option value="public">Public - Anyone can see this</option>
                    </select>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Flashcards</h2>
                    {formData.flashcards.map((flashcard, index) => (
                        <div key={index} className="p-4 border rounded space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Card {index + 1}</span>
                                {formData.flashcards.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeFlashcard(index)}
                                        className="text-red-500"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <label className="block mb-1">Type</label>
                                <select
                                    value={flashcard.type}
                                    onChange={(e) => handleTypeChange(index, e.target.value as FlashcardType)}
                                    className="w-full p-2 pl-3 pr-10 border rounded appearance-none bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                    cursor-pointer transition-colors"
                                    required
                                >
                                    <option value="text">📝 Text</option>
                                    <option value="image">🖼️ Image</option>
                                    <option value="multipleChoice">📋 Multiple Choice</option>
                                    <option value="audio">🎵 Audio</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 mt-6 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {renderFlashcardFields(flashcard, index)}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addFlashcard}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 text-gray-600 flex items-center justify-center gap-2"
                    >
                        <IoAdd /> Add Flashcard
                    </button>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="loader-dots"></div>
                    ) : (
                        'Update Lesson'
                    )}
                </button>
            </form>
        </div>
    );
};

export default EditFlashcardPage;