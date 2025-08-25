import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  code?: string
  language?: string
  suggestions?: CodeSuggestion[]
  analysis?: CodeAnalysis
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  timestamp: Date
  isPinned: boolean
  folder?: string
  isEditing: boolean
}

interface ChatFolder {
  id: string
  name: string
  color: string
  icon: string
}

interface CodeSnippet {
  code: string
  language: string
  description: string
}

interface CodeSuggestion {
  type: 'autocomplete' | 'refactor' | 'optimization' | 'security' | 'test'
  code: string
  description: string
  confidence: number
}

interface CodeAnalysis {
  security: SecurityIssue[]
  performance: PerformanceIssue[]
  bestPractices: string[]
  complexity: 'low' | 'medium' | 'high'
}

interface SecurityIssue {
  type: 'sql-injection' | 'xss' | 'unsafe-input' | 'hardcoded-secrets'
  severity: 'low' | 'medium' | 'high'
  description: string
  fix: string
  line?: number
}

interface PerformanceIssue {
  type: 'algorithm' | 'memory' | 'io' | 'complexity'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestion: string
  line?: number
}

interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  category: 'code-review' | 'testing' | 'optimization' | 'security' | 'documentation'
}

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
    currentRecognition?: SpeechRecognition
  }
}

function App() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [
        {
          id: '1',
          type: 'assistant',
          content: 'Hello! I\'m your **Advanced AI Coding Assistant** with powerful features:\n\n🚀 **Code Intelligence**\n• Smart autocomplete & suggestions\n• Multi-language support (Python, JS, C++, Rust, etc.)\n• Real-time code analysis\n\n🔒 **Security & Quality**\n• Security vulnerability scanning\n• Performance optimization advice\n• Best practices enforcement\n\n🧪 **Testing & Documentation**\n• Unit test generation\n• Code documentation\n• Algorithm explanations\n\n💡 **Advanced Features**\n• Split view with editable code pane\n• Context-aware suggestions\n• Project structure understanding\n\nUpload a file or describe what you need, and I\'ll help you code it!',
          timestamp: new Date()
        }
      ],
      timestamp: new Date(),
      isPinned: false,
      isEditing: false
    }
  ])
  const [currentChatId, setCurrentChatId] = useState('1')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([])
  const [enterpriseMode, setEnterpriseMode] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSplitView, setShowSplitView] = useState(false)
  const [editableCode, setEditableCode] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [currentSuggestions, setCurrentSuggestions] = useState<CodeSuggestion[]>([])
  
  // New state for functional buttons
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  
  // Chat folder management
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([
    { id: '1', name: 'General', color: '#6b7280', icon: '📁' },
    { id: '2', name: 'Work', color: '#3b82f6', icon: '💼' },
    { id: '3', name: 'Personal', color: '#10b981', icon: '👤' },
    { id: '4', name: 'Projects', color: '#f59e0b', icon: '🚀' }
  ])
  const [showFolderManager, setShowFolderManager] = useState(false)
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  
  // Drag and drop state
  const [draggedChat, setDraggedChat] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null)
  
  // Force split view for testing - remove this later
  const forceSplitView = () => {
    setShowSplitView(true)
    setEditableCode('// Test code for split view\nfunction hello() {\n  console.log("Hello from split view!");\n}')
  }
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const codeInputRef = useRef<HTMLTextAreaElement>(null)

  // Advanced Prompt Templates
  const promptTemplates: PromptTemplate[] = [
    {
      id: '1',
      name: '🔍 Code Review',
      description: 'Analyze code for bugs, security issues, and improvements',
      prompt: 'Please review this code for:\n1. Potential bugs and edge cases\n2. Security vulnerabilities\n3. Performance optimizations\n4. Code style and best practices\n5. Suggest improvements',
      category: 'code-review'
    },
    {
      id: '2',
      name: '🧪 Generate Tests',
      description: 'Create comprehensive unit tests for the code',
      prompt: 'Please generate comprehensive unit tests for this code including:\n1. Happy path tests\n2. Edge case tests\n3. Error handling tests\n4. Mock setup if needed',
      category: 'testing'
    },
    {
      id: '3',
      name: '⚡ Optimize Performance',
      description: 'Analyze and optimize code performance',
      prompt: 'Please analyze this code for performance issues and suggest:\n1. Algorithm improvements\n2. Memory optimizations\n3. I/O optimizations\n4. Time complexity analysis',
      category: 'optimization'
    },
    {
      id: '4',
      name: '🔒 Security Audit',
      description: 'Scan code for security vulnerabilities',
      prompt: 'Please perform a security audit of this code looking for:\n1. SQL injection vulnerabilities\n2. XSS vulnerabilities\n3. Input validation issues\n4. Authentication/authorization flaws\n5. Secure coding practices',
      category: 'security'
    },
    {
      id: '5',
      name: '📚 Add Documentation',
      description: 'Generate comprehensive code documentation',
      prompt: 'Please add comprehensive documentation to this code including:\n1. Function/class descriptions\n2. Parameter documentation\n3. Return value documentation\n4. Usage examples\n5. Inline comments for complex logic',
      category: 'documentation'
    }
  ]

  const currentChat = chats.find(chat => chat.id === currentChatId)
  const messages = currentChat?.messages || []

  // Check for API key in environment variables
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
      setApiKey(envApiKey)
      // Don't automatically enable Enterprise Mode - let user choose
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Enhanced code analysis functions
  const analyzeCode = (code: string, language: string): CodeAnalysis => {
    const analysis: CodeAnalysis = {
      security: [],
      performance: [],
      bestPractices: [],
      complexity: 'low'
    }

    // Security analysis
    if (code.includes('SELECT') && code.includes('${') && !code.includes('parameterized')) {
      analysis.security.push({
        type: 'sql-injection',
        severity: 'high',
        description: 'Potential SQL injection vulnerability detected',
        fix: 'Use parameterized queries or prepared statements'
      })
    }

    if (code.includes('innerHTML') || code.includes('document.write')) {
      analysis.security.push({
        type: 'xss',
        severity: 'medium',
        description: 'Potential XSS vulnerability detected',
        fix: 'Use textContent or proper sanitization'
      })
    }

    // Performance analysis
    if (code.includes('for (let i = 0; i < array.length; i++)')) {
      analysis.performance.push({
        type: 'algorithm',
        severity: 'low',
        description: 'Consider using forEach or for...of for better readability',
        suggestion: 'Use array.forEach() or for...of loop'
      })
    }

    if (code.includes('setTimeout') && code.includes('setInterval')) {
      analysis.performance.push({
        type: 'memory',
        severity: 'medium',
        description: 'Potential memory leak with timers',
        suggestion: 'Clear timers when component unmounts'
      })
    }

    // Best practices
    if (code.includes('var ')) {
      analysis.bestPractices.push('Use const or let instead of var')
    }

    if (code.includes('==') && !code.includes('===')) {
      analysis.bestPractices.push('Use strict equality (===) instead of loose equality (==)')
    }

    // Complexity analysis
    const lines = code.split('\n').length
    if (lines > 50) analysis.complexity = 'high'
    else if (lines > 20) analysis.complexity = 'medium'

    return analysis
  }

  const generateUnitTests = (code: string, language: string): string => {
    const testTemplates: { [key: string]: string } = {
      javascript: `// Unit Tests for ${language}
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Code Tests', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should handle basic functionality', () => {
    // Test basic functionality
    expect(true).toBe(true);
  });

  it('should handle edge cases', () => {
    // Test edge cases
    expect(() => {
      // Your edge case test here
    }).not.toThrow();
  });

  it('should handle error conditions', () => {
    // Test error handling
    expect(() => {
      // Your error test here
    }).toThrow();
  });
});`,
      python: `# Unit Tests for ${language}
import unittest
from unittest.mock import Mock, patch

class TestCode(unittest.TestCase):
    def setUp(self):
        # Setup before each test
        pass

    def test_basic_functionality(self):
        # Test basic functionality
        self.assertTrue(True)

    def test_edge_cases(self):
        # Test edge cases
        with self.assertRaises(Exception):
            # Your edge case test here
            pass

    def test_error_conditions(self):
        # Test error handling
        with self.assertRaises(ValueError):
            # Your error test here
            pass

if __name__ == '__main__':
    unittest.main()`
    }

    return testTemplates[language] || testTemplates.javascript
  }

  const generateCodeSuggestions = (code: string, language: string): CodeSuggestion[] => {
    const suggestions: CodeSuggestion[] = []

    // Autocomplete suggestions
    if (code.includes('function') && !code.includes('return')) {
      suggestions.push({
        type: 'autocomplete',
        code: 'return result;',
        description: 'Add return statement',
        confidence: 0.9
      })
    }

    // Refactoring suggestions
    if (code.includes('if (condition === true)')) {
      suggestions.push({
        type: 'refactor',
        code: 'if (condition)',
        description: 'Simplify boolean comparison',
        confidence: 0.8
      })
    }

    // Performance suggestions
    if (code.includes('array.filter().map()')) {
      suggestions.push({
        type: 'optimization',
        code: 'array.reduce()',
        description: 'Use reduce for better performance',
        confidence: 0.7
      })
    }

    return suggestions
  }

  const handlePromptTemplate = (template: PromptTemplate) => {
    if (editableCode.trim()) {
      const enhancedPrompt = `${template.prompt}\n\nCode to analyze:\n\`\`\`${selectedLanguage}\n${editableCode}\n\`\`\``
      setInputValue(enhancedPrompt)
    } else {
      setInputValue(template.prompt)
    }
  }

  const toggleSplitView = () => {
    const newSplitViewState = !showSplitView
    console.log('Toggling split view from', showSplitView, 'to', newSplitViewState)
    setShowSplitView(newSplitViewState)
    
    if (newSplitViewState && editableCode.trim() === '') {
      // Extract code from current message if available when opening split view
      const lastCodeMessage = messages
        .filter(m => m.code)
        .pop()
      if (lastCodeMessage?.code) {
        setEditableCode(lastCodeMessage.code)
      }
    }
  }
  
  // Functional button handlers
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker)
  }
  
  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions)
  }
  
  const addLocationContext = () => {
    const location = prompt('Add location context (e.g., "Working from home", "Office", "Coffee shop"):')
    if (location) {
      setInputValue(prev => `📍 Location: ${location}\n\n${prev}`)
    }
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files])
      
      // Add file info to input
      const fileInfo = files.map(file => `📎 File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`).join('\n')
      setInputValue(prev => `${fileInfo}\n\n${prev}`)
      
      // Show success message
      alert(`Uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`)
    }
  }

  const handleCodeChange = (newCode: string) => {
    setEditableCode(newCode)
    
    // Generate real-time suggestions
    if (newCode.length > 10) {
      const suggestions = generateCodeSuggestions(newCode, selectedLanguage)
      setCurrentSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const applySuggestion = (suggestion: CodeSuggestion) => {
    setEditableCode(prev => prev + '\n' + suggestion.code)
    setShowSuggestions(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: enterpriseMode ? [
        {
          id: '1',
          type: 'system',
          content: `**E& ChatGPT-4.1 Terms and Conditions**

ChatGPT is a research tool which can provide information as a response to generic questions, which are not specific to Etisalat and its affairs. It is a public platform where communications are not encrypted and such data could be leaked and used by third parties.

As an employee of Etisalat, you have a duty of confidentiality to Etisalat which you have undertaken as a condition to your employment. You are bound by all confidentiality obligations at law, under your employment contract, Human Resources Manual and as set by Etisalat, such as ongoing compliance with all internal IT/Security policies [Click here](https://go.skype.com.rproxy.goskope.com/cards.unsupported.).

**DO NOT disclose:**
• Any personal data such as your salary, passwords, bank details etc.
• Any information of Etisalat which is not in the public domain as this is confidential and often restricted sensitive business information of Etisalat.

As a reminder, confidential data will include (but this is not an exhaustive list):
• Any data and information relating to a Etisalat's suppliers, customers, affiliates and their customers;
• The fact that discussions and negotiations are taking place concerning projects or transactions and the status of those discussions and negotiations;
• The existence and terms of agreements where Etisalat is a party to them;
• Any information that would be regarded as confidential by a reasonable business person relating to:
  - (i) The business, affairs, customers, clients, suppliers, plans, intentions, or market opportunities, and
  - (ii) The operations, processes, product information, site-information, know-how, designs, trade secrets or software; and
  - (iii) Any other commercial, financial, legal, technical and/or other information, including any devices, graphics, systems, drawings, specifications, data, written information or information in other tangible form; any information or analysis derived from the confidential information including all notes, memos, reports, calculations, compilations, analyses, forecasts, conclusions, summaries or other material generated or produced partly or wholly from any confidential information

**In addition, DO NOT:**
• Rely on any responses of ChatGPT in carrying out your work responsibilities or discharging your duties. This is because ChatGPT is merely a tool and a virtual assistant which cannot replace human work, advice and governance set by Etisalat.
• Copy and paste into the ChatGPT any company information, data or text from Outlook, MT or other work apps/systems/docs or platforms of Etisalat.

**Please accept the terms and conditions to proceed**`,
          timestamp: new Date()
        }
      ] : [
        {
          id: '1',
          type: 'assistant',
          content: 'Hello! I\'m your AI coding assistant. I can help you with:\n\n• **Code Generation**: Write code from descriptions\n• **Code Review**: Analyze and improve your code\n• **Debugging**: Find and fix issues\n• **Algorithm Design**: Optimize solutions\n• **Best Practices**: Follow coding standards\n\nUpload a file or describe what you need, and I\'ll help you code it!',
          timestamp: new Date()
        }
      ],
      timestamp: new Date(),
      isPinned: false,
      isEditing: false
    }
    
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setAcceptedTerms(false)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    // Add user message to current chat and auto-generate title if it's a new chat
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.title === 'New Chat' ? generateChatTitle([...chat.messages, userMessage]) : chat.title
          }
        : chat
    ))
    setInputValue('')
    setIsLoading(true)

    if (enterpriseMode && apiKey && acceptedTerms) {
      // Use real ChatGPT 4.1 API
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an expert ${selectedLanguage} coding assistant. Generate clean, well-commented code based on the user's request. Always include the complete code with proper syntax and explain your approach.`
              },
              {
                role: 'user',
                content: inputValue
              }
            ],
            max_tokens: 2000,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const codeContent = data.choices?.[0]?.message?.content || '';
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Here's your code generated by ChatGPT 4.1:\n\n`,
          timestamp: new Date(),
          code: codeContent,
          language: selectedLanguage
        }
        
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        ))
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `❌ **Error**: ${error instanceof Error ? error.message : 'API request failed'}\n\nPlease check your API key and try again.`,
          timestamp: new Date()
        }
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        ))
      }
    } else {
      // Demo mode - use ChatGPT 4 API if available, otherwise fallback to simulated response
      if (apiKey && apiKey !== 'your_openai_api_key_here') {
        // Use real ChatGPT 4 API for demo mode
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert ${selectedLanguage} coding assistant. Generate clean, well-commented code based on the user's request. Always include the complete code with proper syntax and explain your approach.`
                },
                {
                  role: 'user',
                  content: inputValue
                }
              ],
              max_tokens: 2000,
              temperature: 0.3,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: data.choices[0].message.content,
            timestamp: new Date()
          }
          setChats(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          ))
        } catch (error) {
          console.error('Demo mode API error:', error);
          // Fallback to simulated response
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `I understand you're asking about: "${inputValue}"\n\nThis is a fallback response. Please check your API key configuration.`,
            timestamp: new Date()
          }
          setChats(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, fallbackMessage] }
              : chat
          ))
        }
      } else {
        // No API key available - use simulated response
        setTimeout(() => {
          const isCodeRequest = inputValue.toLowerCase().includes('code') || 
                               inputValue.toLowerCase().includes('function') ||
                               inputValue.toLowerCase().includes('algorithm') ||
                               inputValue.toLowerCase().includes('write')

          let responseContent = ''
          let codeResponse = ''

          if (isCodeRequest) {
            responseContent = `I'll help you with that! Here's a solution using ${selectedLanguage}:\n\n`
            codeResponse = generateSampleCode(inputValue, selectedLanguage)
            responseContent += codeResponse
          } else {
            responseContent = `I understand you're asking about: "${inputValue}"\n\nThis is a simulated response. Add your API key for real ChatGPT 4 responses.`
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            code: codeResponse,
            language: selectedLanguage,
            analysis: codeResponse ? analyzeCode(codeResponse, selectedLanguage) : undefined
          }
          setChats(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          ))
          setIsLoading(false)
        }, 1500)
      }
    }
    
    setIsLoading(false)
  }

  const generateSampleCode = (request: string, language: string): string => {
    const codeExamples: { [key: string]: string } = {
      javascript: `function ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}() {
  // TODO: Implement your logic here
  console.log("Hello from ${language}!");
  
  // Example implementation
  return {
    success: true,
    message: "Function executed successfully"
  };
}

// Usage
const result = ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}();
console.log(result);`,
      python: `def ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}():
    """
    TODO: Add your function description here
    """
    # Example implementation
    print("Hello from ${language}!")
    
    return {
        "success": True,
        "message": "Function executed successfully"
    }

# Usage
if __name__ == "__main__":
    result = ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}()
    print(result)`,
      typescript: `interface ${request.charAt(0).toUpperCase() + request.slice(1).toLowerCase().replace(/[^a-zA-Z]/g, '')}Result {
  success: boolean;
  message: string;
}

function ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}(): ${request.charAt(0).toUpperCase() + request.slice(1).toLowerCase().replace(/[^a-zA-Z]/g, '')}Result {
  // TODO: Implement your logic here
  console.log("Hello from ${language}!");
  
  return {
    success: true,
    message: "Function executed successfully"
  };
}

// Usage
const result: ${request.charAt(0).toUpperCase() + request.slice(1).toLowerCase().replace(/[^a-zA-Z]/g, '')}Result = ${request.toLowerCase().replace(/[^a-zA-Z]/g, '')}();
console.log(result);`
    }

    return codeExamples[language] || codeExamples.javascript
  }





  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleEnterpriseMode = () => {
    if (enterpriseMode) {
      // Turning off enterprise mode - go back to demo
      setEnterpriseMode(false)
      setApiKey('')
      setAcceptedTerms(false)
      setShowApiKeyInput(false)
      // Reset chats to demo mode
      setChats([{
        id: '1',
        title: 'New Chat',
        messages: [{
          id: '1',
          type: 'assistant',
          content: 'Hello! I\'m your AI coding assistant. I can help you with:\n\n• **Code Generation**: Write code from descriptions\n• **Code Review**: Analyze and improve your code\n• **Debugging**: Find and fix issues\n• **Algorithm Design**: Optimize solutions\n• **Best Practices**: Follow coding standards\n\nUpload a file or describe what you need, and I\'ll help you code it!',
          timestamp: new Date()
        }],
        timestamp: new Date(),
        isPinned: false,
        isEditing: false
      }])
      setCurrentChatId('1')
    } else {
      // Turning on enterprise mode - automatically use API key from .env
      const envApiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
        setApiKey(envApiKey)
        setEnterpriseMode(true)
        // Reset chats to enterprise mode with terms
        setChats([{
          id: '1',
          title: 'New Chat',
          messages: [{
            id: '1',
            type: 'system',
            content: `**E& ChatGPT-4.1 Terms and Conditions**

ChatGPT is a research tool which can provide information as a response to generic questions, which are not specific to Etisalat and its affairs. It is a public platform where communications are not encrypted and such data could be leaked and used by third parties.

As an employee of Etisalat, you have a duty of confidentiality to Etisalat which you have undertaken as a condition to your employment. You are bound by all confidentiality obligations at law, under your employment contract, Human Resources Manual and as set by Etisalat, such as ongoing compliance with all internal IT/Security policies [Click here](https://go.skype.com.rproxy.goskope.com/cards.unsupported.).

**DO NOT disclose:**
• Any personal data such as your salary, passwords, bank details etc.
• Any information of Etisalat which is not in the public domain as this is confidential and often restricted sensitive business information of Etisalat.

As a reminder, confidential data will include (but this is not an exhaustive list):
• Any data and information relating to a Etisalat's suppliers, customers, affiliates and their customers;
• The fact that discussions and negotiations are taking place concerning projects or transactions and the status of those discussions and negotiations;
• The existence and terms of agreements where Etisalat is a party to them;
• Any information that would be regarded as confidential by a reasonable business person relating to:
  - (i) The business, affairs, customers, clients, suppliers, plans, intentions, or market opportunities, and
  - (ii) The operations, processes, product information, site-information, know-how, designs, trade secrets or software; and
  - (iii) Any other commercial, financial, legal, technical and/or other information, including any devices, graphics, systems, drawings, specifications, data, written information or information in other tangible form; any information or analysis derived from the confidential information including all notes, memos, reports, calculations, compilations, analyses, forecasts, conclusions, summaries or other material generated or produced partly or wholly from any confidential information

**In addition, DO NOT:**
• Rely on any responses of ChatGPT in carrying out your work responsibilities or discharging your duties. This is because ChatGPT is merely a tool and a virtual assistant which cannot replace human work, advice and governance set by Etisalat.
• Copy and paste into the ChatGPT any company information, data or text from Outlook, MT or other work apps/systems/docs or platforms of Etisalat.

**Please accept the terms and conditions to proceed**`,
            timestamp: new Date()
          }],
          timestamp: new Date(),
          isPinned: false,
          isEditing: false
        }])
        setCurrentChatId('1')
      } else {
        // If no valid API key in .env, show modal to get it manually
        setShowApiKeyInput(true)
      }
    }
  }

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setShowApiKeyInput(false)
      setEnterpriseMode(true)
      // Reset chats to enterprise mode with terms
      setChats([{
        id: '1',
        title: 'New Chat',
        messages: [{
          id: '1',
          type: 'system',
          content: `**E& ChatGPT-4.1 Terms and Conditions**

ChatGPT is a research tool which can provide information as a response to generic questions, which are not specific to Etisalat and its affairs. It is a public platform where communications are not encrypted and such data could be leaked and used by third parties.

As an employee of Etisalat, you have a duty of confidentiality to Etisalat which you have undertaken as a condition to your employment. You are bound by all confidentiality obligations at law, under your employment contract, Human Resources Manual and as set by Etisalat, such as ongoing compliance with all internal IT/Security policies [Click here](https://go.skype.com.rproxy.goskope.com/cards.unsupported.).

**DO NOT disclose:**
• Any personal data such as your salary, passwords, bank details etc.
• Any information of Etisalat which is not in the public domain as this is confidential and often restricted sensitive business information of Etisalat.

As a reminder, confidential data will include (but this is not an exhaustive list):
• Any data and information relating to a Etisalat's suppliers, customers, affiliates and their customers;
• The fact that discussions and negotiations are taking place concerning projects or transactions and the status of those discussions and negotiations;
• The existence and terms of agreements where Etisalat is a party to them;
• Any information that would be regarded as confidential by a reasonable business person relating to:
  - (i) The business, affairs, customers, clients, suppliers, plans, intentions, or market opportunities, and
  - (ii) The operations, processes, product information, site-information, know-how, designs, trade secrets or software; and
  - (iii) Any other commercial, financial, legal, technical and/or other information, including any devices, graphics, systems, drawings, specifications, data, written information or information in other tangible form; any information or analysis derived from the confidential information including all notes, memos, reports, calculations, compilations, analyses, forecasts, conclusions, summaries or other material generated or produced partly or wholly from any confidential information

**In addition, DO NOT:**
• Rely on any responses of ChatGPT in carrying out your work responsibilities or discharging your duties. This is because ChatGPT is merely a tool and a virtual assistant which cannot replace human work, advice and governance set by Etisalat.
• Copy and paste into the ChatGPT any company information, data or text from Outlook, MT or other work apps/systems/docs or platforms of Etisalat.

**Please accept the terms and conditions to proceed**`,
          timestamp: new Date()
        }],
        timestamp: new Date(),
        isPinned: false,
        isEditing: false
      }])
      setCurrentChatId('1')
    }
  }

  const getApiKeyStatus = () => {
    if (enterpriseMode && apiKey && acceptedTerms) {
      return '🟢 E& Mode'
    } else if (enterpriseMode && apiKey) {
      return '🟡 Ready'
    } else {
      return '🔴 Demo Mode'
    }
  }

  const handleAcceptTerms = () => {
    setAcceptedTerms(true)
  }

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording()
    } else {
      stopRecording()
    }
  }
  
  const startRecording = () => {
    console.log('Starting voice recording...')
    
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        console.log('Voice recording started')
        setIsRecording(true)
        setInputValue(prev => prev + '\n🎤 Recording... ')
      }
      
      recognition.onresult = (event) => {
        console.log('Voice recognition result:', event)
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        console.log('Final transcript:', finalTranscript)
        console.log('Interim transcript:', interimTranscript)
        
        // Update input with transcribed text
        setInputValue(prev => {
          const withoutRecording = prev.replace(/\n🎤 Recording\.\.\. .*$/, '')
          return withoutRecording + '\n🎤 ' + finalTranscript + interimTranscript
        })
      }
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        
        let errorMessage = 'Voice input error: ' + event.error
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.'
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please speak clearly and try again.'
        } else if (event.error === 'audio-capture') {
          errorMessage = 'Audio capture failed. Please check your microphone and try again.'
        }
        
        setInputValue(prev => prev.replace(/\n🎤 Recording\.\.\. .*$/, '') + '\n❌ ' + errorMessage)
      }
      
      recognition.onend = () => {
        console.log('Voice recording ended')
        setIsRecording(false)
        setInputValue(prev => prev.replace(/\n🎤 Recording\.\.\. .*$/, ''))
      }
      
      // Store recognition instance to stop it later
      window.currentRecognition = recognition
      
      try {
        recognition.start()
        console.log('Recognition.start() called successfully')
      } catch (error) {
        console.error('Error starting recognition:', error)
        setIsRecording(false)
        setInputValue(prev => prev + '\n❌ Failed to start voice recording: ' + error)
      }
    } else {
      console.error('Speech recognition not supported')
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
    }
  }
  
  const stopRecording = () => {
    if (window.currentRecognition) {
      window.currentRecognition.stop()
      window.currentRecognition = undefined
    }
    setIsRecording(false)
    setInputValue(prev => prev.replace(/\n🎤 Recording\.\.\. .*$/, ''))
  }

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId)
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id)
      } else {
        createNewChat()
      }
    }
  }

  const updateChatTitle = (chatId: string, newTitle: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle, isEditing: false } : chat
    ))
  }

  const togglePinChat = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    ))
  }

  const startEditingChat = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isEditing: true } : chat
    ))
  }

  const addChatToFolder = (chatId: string, folderName: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, folder: folderName } : chat
    ))
  }

  const removeChatFromFolder = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, folder: undefined } : chat
    ))
  }
  
  // Folder management functions
  const createNewFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: ChatFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
        icon: '📁'
      }
      setChatFolders(prev => [...prev, newFolder])
      setNewFolderName('')
    }
  }
  
  const updateFolder = (folderId: string, updates: Partial<ChatFolder>) => {
    setChatFolders(prev => prev.map(folder => 
      folder.id === folderId ? { ...folder, ...updates } : folder
    ))
  }
  
  const deleteFolder = (folderId: string) => {
    // Move all chats from this folder to unassigned (no folder)
    setChats(prev => prev.map(chat => 
      chat.folder === folderId ? { ...chat, folder: undefined } : chat
    ))
    // Remove the folder
    setChatFolders(prev => prev.filter(folder => folder.id !== folderId))
  }
  
  const moveChatToFolder = (chatId: string, folderId: string) => {
    console.log(`🔄 Moving chat ${chatId} to folder ${folderId}`)
    console.log('📊 Before move - chats:', chats)
    console.log('📁 Target folder:', chatFolders.find(f => f.id === folderId))
    
    setChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === chatId ? { ...chat, folder: folderId } : chat
      )
      console.log('📊 After move - updated chats:', updatedChats)
      return updatedChats
    })
    
    console.log('✅ Chat moved successfully')
  }
  
  const getChatsByFolder = (folderId: string) => {
    return chats.filter(chat => chat.folder === folderId)
  }
  
  const getUnassignedChats = () => {
    return chats.filter(chat => !chat.folder)
  }
  
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }
  
  // Monitor chats state changes for debugging
  useEffect(() => {
    console.log('🔄 Chats state updated:', chats)
    console.log('📁 Chat folders:', chatFolders)
    
    // Log chats by folder
    chatFolders.forEach(folder => {
      const folderChats = chats.filter(chat => chat.folder === folder.id)
      console.log(`📂 Folder "${folder.name}":`, folderChats.length, 'chats')
    })
    
    const unassignedChats = chats.filter(chat => !chat.folder)
    console.log('📂 Unassigned chats:', unassignedChats.length)
  }, [chats, chatFolders])
  
  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, chatId: string) => {
    console.log('🔄 Drag started for chat:', chatId)
    setDraggedChat(chatId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', chatId)
    
    // Add visual feedback
    const element = e.currentTarget as HTMLElement
    element.style.transform = 'rotate(5deg) scale(1.05)'
    element.style.opacity = '0.7'
  }
  
  const handleDragOver = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (folderId) {
      console.log('🎯 Dragging over folder:', folderId)
      setDragOverFolder(folderId)
    } else {
      console.log('🎯 Dragging over unassigned area')
      setDragOverFolder('unassigned')
    }
  }
  
  const handleDragLeave = () => {
    console.log('🚪 Drag left area')
    setDragOverFolder(null)
  }
  
  const handleDrop = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault()
    console.log('📥 Drop event triggered!')
    console.log('📁 Target folder:', folderId || 'unassigned')
    console.log('💬 Dragged chat:', draggedChat)
    
    if (draggedChat) {
      if (folderId) {
        console.log('✅ Moving chat to folder:', folderId)
        moveChatToFolder(draggedChat, folderId)
      } else {
        console.log('✅ Removing chat from folder')
        removeChatFromFolder(draggedChat)
      }
    } else {
      console.log('❌ No dragged chat found')
    }
    setDraggedChat(null)
    setDragOverFolder(null)
  }
  
  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 Drag ended')
    // Reset visual feedback
    const element = e.currentTarget as HTMLElement
    element.style.transform = ''
    element.style.opacity = ''
    setDraggedChat(null)
    setDragOverFolder(null)
  }
  
  // Context menu functions
  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault()
    setShowContextMenu({ x: e.clientX, y: e.clientY, chatId })
  }
  
  const closeContextMenu = () => {
    setShowContextMenu(null)
  }
  
  const handleRenameChat = (chatId: string) => {
    startEditingChat(chatId)
    closeContextMenu()
  }
  
  const handleDuplicateChat = (chatId: string) => {
    const originalChat = chats.find(chat => chat.id === chatId)
    if (originalChat) {
      const duplicatedChat: Chat = {
        ...originalChat,
        id: Date.now().toString(),
        title: `${originalChat.title} (Copy)`,
        timestamp: new Date(),
        isPinned: false,
        isEditing: false
      }
      setChats(prev => [duplicatedChat, ...prev])
      setCurrentChatId(duplicatedChat.id)
    }
    closeContextMenu()
  }

  // Auto-generate chat title based on first user message
  const generateChatTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(msg => msg.type === 'user')
    if (firstUserMessage) {
      const content = firstUserMessage.content
      if (content.length > 30) {
        return content.substring(0, 30) + '...'
      }
      return content
    }
    return 'New Chat'
  }

  return (
    <div className={`app ${enterpriseMode ? 'enterprise-mode' : 'demo-mode'}`}>
      {/* Floating Sidebar Toggle Button */}
      <button 
        className={`floating-sidebar-toggle ${showSidebar ? 'open' : 'closed'}`}
        onClick={() => setShowSidebar(!showSidebar)}
        title={showSidebar ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {showSidebar ? (
            <path d="m15 18-6-6 6-6"/>
          ) : (
            <path d="m9 18 6-6-6-6"/>
          )}
        </svg>
      </button>
      
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        {/* Top Section - Navigation/Features */}
        <div className="sidebar-top">
          {/* Logo */}
          <div className="sidebar-logo">
            {enterpriseMode ? (
              <img src="/etisalat-logo.png" alt="e& etisalat and logo" className="sidebar-logo-img" />
            ) : (
              <div className="openai-logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M29.54 10.28L16.5 2L3.46 10.28L16.5 18.56L29.54 10.28Z" fill="black"/>
                  <path d="M2 10.28L15.04 18.56L28.08 10.28L15.04 2L2 10.28Z" fill="black"/>
                </svg>
              </div>
            )}
          </div>
          
          {/* New Chat Button */}
          <button className="new-chat-btn" onClick={createNewChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New chat
          </button>
          
          {/* Navigation Menu */}
          <div className="sidebar-nav">
            <button className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              Search chats
            </button>
            <button className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Library
            </button>


          </div>
          
        </div>
        
        {/* Middle Section - Chat List with Folders */}
        <div className="sidebar-chats">
          <div className="chats-header">
            <span>Chats</span>
            <button 
              className="folder-manager-btn"
              onClick={() => setShowFolderManager(!showFolderManager)}
              title="Manage folders"
            >
              📁
            </button>
          </div>
          
          {/* Folder Manager */}
          {showFolderManager && (
            <div className="folder-manager">
              <div className="folder-manager-header">
                <h4>📁 Manage Folders</h4>
                <button onClick={() => setShowFolderManager(false)} className="close-folder-manager">✕</button>
              </div>
              
              {/* Test Button for Debugging */}
              <button 
                className="test-drag-drop-btn"
                onClick={() => {
                  console.log('🧪 Testing drag and drop...')
                  console.log('📁 Current folders:', chatFolders)
                  console.log('💬 Current chats:', chats)
                  console.log('🔄 Dragged chat state:', draggedChat)
                  console.log('🎯 Drag over folder state:', dragOverFolder)
                  
                  // Create a test chat if none exist
                  if (chats.length === 0) {
                    const testChat: Chat = {
                      id: 'test-chat-1',
                      title: 'Test Chat for Drag & Drop',
                      messages: [],
                      timestamp: new Date(),
                      isPinned: false,
                      isEditing: false
                    }
                    setChats([testChat])
                    console.log('✅ Created test chat:', testChat)
                  }
                  
                  // Create a test folder if none exist
                  if (chatFolders.length === 0) {
                    const testFolder: ChatFolder = {
                      id: 'test-folder-1',
                      name: 'Test Folder',
                      color: '#3b82f6',
                      icon: '📁'
                    }
                    setChatFolders([testFolder])
                    console.log('✅ Created test folder:', testFolder)
                  }
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🧪 Test Drag & Drop
              </button>
              
              {/* Create New Folder */}
              <div className="create-folder">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  className="folder-name-input"
                />
                <button onClick={createNewFolder} className="create-folder-btn">+</button>
              </div>
              
              {/* Folder List */}
              <div className="folder-list">
                {chatFolders.map(folder => (
                  <div key={folder.id} className="folder-item">
                    <div className="folder-info">
                      <span className="folder-icon" style={{ color: folder.color }}>{folder.icon}</span>
                      <span className="folder-name">{folder.name}</span>
                      <span className="folder-count">({getChatsByFolder(folder.id).length})</span>
                    </div>
                    <div className="folder-actions">
                      <button 
                        onClick={() => setEditingFolder(folder)}
                        className="edit-folder-btn"
                        title="Edit folder"
                      >
                        ✏️
                      </button>
                      {folder.id !== '1' && (
                        <button 
                          onClick={() => deleteFolder(folder.id)}
                          className="delete-folder-btn"
                          title="Delete folder"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="chat-list">
            {/* Pinned Chats */}
            {chats.filter(chat => chat.isPinned).map((chat) => (
              <div 
                key={chat.id} 
                className={`chat-item pinned ${currentChatId === chat.id ? 'active' : ''} ${draggedChat === chat.id ? 'dragging' : ''}`}
                onClick={() => setCurrentChatId(chat.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, chat.id)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, chat.id)}
              >
                <div className="chat-info">
                  {chat.isEditing ? (
                    <input
                      type="text"
                      value={chat.title}
                      onChange={(e) => updateChatTitle(chat.id, e.target.value)}
                      onBlur={() => updateChatTitle(chat.id, chat.title)}
                      onKeyPress={(e) => e.key === 'Enter' && updateChatTitle(chat.id, chat.title)}
                      className="chat-title-input"
                      autoFocus
                    />
                  ) : (
                    <span className="chat-title" onDoubleClick={() => startEditingChat(chat.id)}>
                      📌 {chat.title}
                    </span>
                  )}
                  {chat.folder && (
                    <span className="chat-folder-tag" style={{ 
                      backgroundColor: chatFolders.find(f => f.id === chat.folder)?.color + '20',
                      color: chatFolders.find(f => f.id === chat.folder)?.color
                    }}>
                      {chatFolders.find(f => f.id === chat.folder)?.icon}
                    </span>
                  )}
                </div>
                <div className="chat-actions">
                  <button 
                    className="pin-chat-btn pinned"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePinChat(chat.id)
                    }}
                    title="Unpin chat"
                  >
                    📌
                  </button>
                  <button 
                    className="move-chat-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Show folder selection for this chat
                      const targetFolder = prompt(`Move "${chat.title}" to folder:\n\n${chatFolders.map(f => `${f.icon} ${f.name}`).join('\n')}\n\nEnter folder name or leave empty to unassign:`, chat.folder ? chatFolders.find(f => f.id === chat.folder)?.name : '')
                      if (targetFolder !== null) {
                        const folder = chatFolders.find(f => f.name.toLowerCase() === targetFolder.toLowerCase())
                        if (folder) {
                          moveChatToFolder(chat.id, folder.id)
                        } else if (targetFolder.trim() === '') {
                          removeChatFromFolder(chat.id)
                        }
                      }
                    }}
                    title="Move to folder"
                  >
                    📁
                  </button>
                  <button 
                    className="delete-chat-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                    title="Delete chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {/* Folder Dropdown Menu */}
            {chatFolders.length > 0 && (
              <div className="folder-dropdown-section">
                <div className="folder-dropdown-header">
                  <span className="folder-dropdown-title">📁 Folders</span>
                  <button 
                    className="folder-dropdown-toggle"
                    onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                    title={showFolderDropdown ? 'Collapse folders' : 'Expand folders'}
                  >
                    {showFolderDropdown ? '▼' : '▶'}
                  </button>
                </div>
                
                {showFolderDropdown && (
                  <div className="folder-dropdown-content">
                    {chatFolders.map(folder => {
                      const folderChats = chats.filter(chat => !chat.isPinned && chat.folder === folder.id)
                      const isExpanded = expandedFolders.has(folder.id)
                      
                      return (
                        <div key={folder.id}>
                          <div 
                            className={`folder-dropdown-item ${dragOverFolder === folder.id ? 'drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, folder.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, folder.id)}
                          >
                            <div className="folder-dropdown-info">
                              <button 
                                className="folder-expand-toggle"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFolderExpansion(folder.id)
                                }}
                                title={isExpanded ? 'Collapse folder' : 'Expand folder'}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <span className="folder-icon" style={{ color: folder.color }}>{folder.icon}</span>
                              {editingFolder?.id === folder.id ? (
                                <input
                                  type="text"
                                  value={editingFolder.name}
                                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                  onBlur={() => {
                                    if (editingFolder.name.trim()) {
                                      updateFolder(folder.id, { name: editingFolder.name.trim() })
                                    }
                                    setEditingFolder(null)
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && editingFolder.name.trim()) {
                                      updateFolder(folder.id, { name: editingFolder.name.trim() })
                                      setEditingFolder(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingFolder(null)
                                    }
                                  }}
                                  className="folder-name-input"
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="folder-name" 
                                  onDoubleClick={() => setEditingFolder(folder)}
                                  title="Double-click to rename"
                                >
                                  {folder.name}
                                </span>
                              )}
                              <span className="folder-count">({folderChats.length})</span>
                            </div>
                            {dragOverFolder === folder.id && <span className="drop-indicator">Drop here!</span>}
                          </div>
                          
                          {/* Expanded Folder Chats */}
                          {isExpanded && folderChats.length > 0 && (
                            <div className="folder-chats-expanded">
                              {folderChats.map((chat) => (
                                <div 
                                  key={chat.id} 
                                  className={`chat-item folder-chat ${currentChatId === chat.id ? 'active' : ''} ${draggedChat === chat.id ? 'dragging' : ''}`}
                                  onClick={() => setCurrentChatId(chat.id)}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, chat.id)}
                                  onDragEnd={handleDragEnd}
                                  onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                >
                                  <div className="chat-info">
                                    {chat.isEditing ? (
                                      <input
                                        type="text"
                                        value={chat.title}
                                        onChange={(e) => updateChatTitle(chat.id, e.target.value)}
                                        onBlur={() => updateChatTitle(chat.id, chat.title)}
                                        onKeyPress={(e) => e.key === 'Enter' && updateChatTitle(chat.id, chat.title)}
                                        className="chat-title-input"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="chat-title" onDoubleClick={() => startEditingChat(chat.id)}>
                                        {chat.title}
                                      </span>
                                    )}
                                  </div>
                                  <div className="chat-actions">
                                    <button 
                                      className="pin-chat-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        togglePinChat(chat.id)
                                      }}
                                      title="Pin chat"
                                    >
                                      📌
                                    </button>
                                    <button 
                                      className="delete-chat-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteChat(chat.id)
                                      }}
                                      title="Delete chat"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Empty folder message */}
                          {isExpanded && folderChats.length === 0 && (
                            <div className="empty-folder-message">
                              <span>📁 No chats in this folder</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Unassigned Chats */}
            {(() => {
              const unassignedChats = chats.filter(chat => !chat.isPinned && !chat.folder)
              if (unassignedChats.length === 0) return null
              
              return (
                <div className="unassigned-section">
                  <div className="unassigned-header">
                    <span className="unassigned-icon">📄</span>
                    <span className="unassigned-title">Unassigned</span>
                    <span className="unassigned-count">({unassignedChats.length})</span>
                  </div>
                  {unassignedChats.map((chat) => (
                    <div 
                      key={chat.id} 
                      className={`chat-item ${currentChatId === chat.id ? 'active' : ''} ${draggedChat === chat.id ? 'dragging' : ''}`}
                      onClick={() => setCurrentChatId(chat.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, chat.id)}
                      onDragEnd={handleDragEnd}
                      onContextMenu={(e) => handleContextMenu(e, chat.id)}
                    >
                      <div className="chat-info">
                        {chat.isEditing ? (
                          <input
                            type="text"
                            value={chat.title}
                            onChange={(e) => updateChatTitle(chat.id, e.target.value)}
                            onBlur={() => updateChatTitle(chat.id, chat.title)}
                            onKeyPress={(e) => e.key === 'Enter' && updateChatTitle(chat.id, chat.title)}
                            className="chat-title-input"
                            autoFocus
                          />
                        ) : (
                          <span className="chat-title" onDoubleClick={() => startEditingChat(chat.id)}>
                            {chat.title}
                          </span>
                        )}
                      </div>
                      <div className="chat-actions">
                        <button 
                          className="pin-chat-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePinChat(chat.id)
                          }}
                          title="Pin chat"
                        >
                          📌
                        </button>
                        <button 
                          className="delete-chat-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                          }}
                          title="Delete chat"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
        
        {/* Bottom Section - User Profile - E& Enterprise for both modes */}
        <div className="sidebar-profile">
          <div className="user-avatar">
            <img src="/etisalat-logo.png" alt="e& logo" className="user-avatar-img" />
          </div>
          <div className="user-info">
            <div className="user-name">E& Enterprise</div>
            <div className="user-status">
              {enterpriseMode ? 'Enterprise Mode' : 'Demo Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo">
              {enterpriseMode ? (
                <>
                  <div className="e-logo">
                    <img src="/etisalat-logo.png" alt="e& etisalat and logo" className="e-logo-img" />
      </div>
                  <h1>e& ChatGPT-4.1</h1>
                </>
              ) : (
                <>
                  <span className="logo-icon">🤖</span>
                  <h1>AI Coding Assistant</h1>
                </>
              )}
            </div>
            <div className="header-actions">
              {enterpriseMode && (
                <div className="header-links">
                  <a href="#" className="header-link">Chat</a>
                  <a href="#" className="header-link">Shared</a>
                  <button className="menu-btn">⋮</button>
                </div>
              )}
              
              {/* Enterprise UI Switch Button */}
              <div className="enterprise-switch">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={enterpriseMode}
                    onChange={toggleEnterpriseMode}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="switch-label">
                  {getApiKeyStatus()}
                </span>
              </div>
              
              {!enterpriseMode && (
                <>
                  <select 
                    value={selectedLanguage} 
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="language-selector"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                  </select>
                  <label className="upload-btn">
                    📁 Upload Code
                    <input
                      type="file"
                      multiple
                      accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.html,.css,.json"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </header>

        {/* API Key Input Modal - Only shown if no valid API key in .env */}
        {showApiKeyInput && (
          <div className="api-key-modal">
            <div className="modal-content">
              <h3>🔑 API Key Required</h3>
              <p>No valid OpenAI API key found in environment variables. Please add your API key to the .env file or enter it manually:</p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-your-api-key-here"
                className="api-key-input"
              />
              <div className="modal-actions">
                <button onClick={handleApiKeySubmit} className="submit-btn">
                  Connect to ChatGPT 4.1
        </button>
                <button onClick={() => setShowApiKeyInput(false)} className="cancel-btn">
                  Cancel
                </button>
      </div>
            </div>
          </div>
        )}

        {/* Enterprise Mode Status */}
        {enterpriseMode && apiKey && acceptedTerms && (
          <div className="enterprise-status">
            <div className="status-content">
              <span className="status-icon">🟢</span>
              <div className="status-text">
                <strong>Enterprise Mode Active</strong>
                <p>Connected to ChatGPT 4.1 API</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Dynamic Layout */}
        <div className={`main-content ${showSplitView ? 'split-layout' : 'single-layout'}`}>
          {/* Chat Panel - Left Side */}
          <div className="chat-panel">
            {/* Chat Area */}
            <div className="chat-area">
              <div className="messages">
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-avatar">
                      {enterpriseMode ? (
                        <div className="e-avatar">
                          <img src="/etisalat-logo.png" alt="e& logo" className="e-avatar-img" />
                        </div>
                      ) : (
                        message.type === 'user' ? '👤' : '🤖'
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {message.type === 'system' ? (
                          <div className="terms-message">
                            <div dangerouslySetInnerHTML={{ 
                              __html: message.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br>')
                                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                            }} />
                            {!acceptedTerms && (
                              <button onClick={handleAcceptTerms} className="accept-btn">
                                Accept Terms
                              </button>
                              )}
                          </div>
                        ) : (
                          <>
                            {message.content.split('\n').map((line, index) => (
                              <div key={index}>
                                {line}
                                {index < message.content.split('\n').length - 1 && <br />}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      {message.code && (
                        <div className="code-block">
                          <div className="code-header">
                            <span className="code-language">{message.language}</span>
                            <div className="code-actions">
                              <button 
                                onClick={() => setEditableCode(message.code!)}
                                className="edit-code-btn"
                                title="Edit in Code Editor"
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                onClick={() => copyToClipboard(message.code!)}
                                className="copy-button"
                              >
                                📋 Copy
                              </button>
                            </div>
                          </div>
                          <pre className="code-content">
                            <code>{message.code}</code>
                          </pre>
                          
                          {/* Code Analysis Display */}
                          {message.analysis && (
                            <div className="code-analysis">
                              <div className="analysis-header">
                                <span>🔍 Code Analysis</span>
                              </div>
                              
                              {/* Security Issues */}
                              {message.analysis.security.length > 0 && (
                                <div className="analysis-section security">
                                  <h4>🔒 Security Issues</h4>
                                  {message.analysis.security.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                      <span className="issue-severity">{issue.severity.toUpperCase()}</span>
                                      <span className="issue-desc">{issue.description}</span>
                                      <div className="issue-fix">
                                        <strong>Fix:</strong> {issue.fix}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Performance Issues */}
                              {message.analysis.performance.length > 0 && (
                                <div className="analysis-section performance">
                                  <h4>⚡ Performance Issues</h4>
                                  {message.analysis.performance.map((issue, index) => (
                                    <div key={index} className={`issue-item ${issue.severity}`}>
                                      <span className="issue-severity">{issue.severity.toUpperCase()}</span>
                                      <span className="issue-desc">{issue.description}</span>
                                      <div className="issue-suggestion">
                                        <strong>Suggestion:</strong> {issue.suggestion}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Best Practices */}
                              {message.analysis.bestPractices.length > 0 && (
                                <div className="analysis-section best-practices">
                                  <h4>📚 Best Practices</h4>
                                  <ul className="practices-list">
                                    {message.analysis.bestPractices.map((practice, index) => (
                                      <li key={index}>{practice}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Complexity */}
                              <div className="analysis-section complexity">
                                <h4>📊 Code Complexity</h4>
                                <span className={`complexity-badge ${message.analysis.complexity}`}>
                                  {message.analysis.complexity.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading Indicator */}
                {isLoading && (
                  <div className="message assistant">
                    <div className="message-avatar">
                      {enterpriseMode ? (
                        <div className="e-avatar">
                          <img src="/etisalat-logo.png" alt="e& logo" className="e-avatar-img" />
                        </div>
                      ) : (
                        '🤖'
                      )}
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <div className="loading-text">
                        {enterpriseMode ? 'ChatGPT 4.1 is generating code...' : 'AI is generating code...'}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="input-area">
              <div className="input-container">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  rows={3}
                  className="message-input"
                  disabled={enterpriseMode && !acceptedTerms}
                />
                              <div className="input-actions">
                {/* File Upload Button */}
                <button 
                  className="action-btn"
                  onClick={() => document.getElementById('file-input')?.click()}
                  title="Upload Files"
                >
                  📎
                </button>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".txt,.js,.py,.ts,.jsx,.tsx,.html,.css,.json,.md,.sql,.java,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                
                {/* Emoji Picker Button */}
                <button 
                  className="action-btn"
                  onClick={toggleEmojiPicker}
                  title="Emoji Picker"
                >
                  😊
                </button>
                
                {/* Voice Input Button */}
                <button 
                  className={`action-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  title="Voice Input"
                >
                  🎤
                </button>
                
                {/* Location/Context Button */}
                <button 
                  className="action-btn"
                  onClick={addLocationContext}
                  title="Add Location Context"
                >
                  📍
                </button>
                
                {/* Quick Actions Menu */}
                <button 
                  className="action-btn"
                  onClick={toggleQuickActions}
                  title="Quick Actions"
                >
                  +
                </button>
                
                {/* Send Button */}
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || (enterpriseMode && !acceptedTerms)}
                  className="send-btn"
                >
                  ▶
                </button>
              </div>
              </div>
              
              {!enterpriseMode && (
                <div className="input-suggestions">
                  <span className="suggestion-label">Quick prompts:</span>
                  <button 
                    onClick={() => setInputValue('Write a function to sort an array')}
                    className="suggestion-btn"
                  >
                    Sort Array
                  </button>
                  <button 
                    onClick={() => setInputValue('Create a REST API endpoint')}
                    className="suggestion-btn"
                  >
                    REST API
                  </button>
                  <button 
                    onClick={() => setInputValue('Debug this code for memory leaks')}
                    className="suggestion-btn"
                  >
                    Debug Code
                  </button>
                </div>
              )}
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <div className="emoji-picker-header">
                    <span>😊 Emojis</span>
                    <button onClick={() => setShowEmojiPicker(false)} className="close-emoji">✕</button>
                  </div>
                  <div className="emoji-grid">
                    {['😊', '😂', '🤔', '👍', '👎', '❤️', '🔥', '💡', '🚀', '🎯', '📚', '⚡', '🔒', '🐛', '✨', '🎉'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputValue(prev => prev + emoji)
                          setShowEmojiPicker(false)
                        }}
                        className="emoji-btn"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quick Actions Menu */}
              {showQuickActions && (
                <div className="quick-actions">
                  <div className="quick-actions-header">
                    <span>⚡ Quick Actions</span>
                    <button onClick={() => setShowQuickActions(false)} className="close-actions">✕</button>
                  </div>
                  <div className="actions-grid">
                    <button
                      onClick={() => {
                        setInputValue(prev => `📋 Copy this code:\n\n${prev}`)
                        setShowQuickActions(false)
                      }}
                      className="action-item"
                    >
                      📋 Copy Code
                    </button>
                    <button
                      onClick={() => {
                        setInputValue(prev => `🔍 Review this code:\n\n${prev}`)
                        setShowQuickActions(false)
                      }}
                      className="action-item"
                    >
                      🔍 Code Review
                    </button>
                    <button
                      onClick={() => {
                        setInputValue(prev => `🧪 Generate tests for:\n\n${prev}`)
                        setShowQuickActions(false)
                      }}
                      className="action-item"
                    >
                      🧪 Generate Tests
                    </button>
                    <button
                      onClick={() => {
                        setInputValue(prev => `⚡ Optimize this code:\n\n${prev}`)
                        setShowQuickActions(false)
                      }}
                      className="action-item"
                    >
                      ⚡ Optimize
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Code Editor Panel - Right Side (Only in Split View) */}
          {showSplitView && (
            <div className="code-panel">
              <div className="code-editor-pane">
                <div className="editor-header">
                  <span className="editor-title">📝 Code Editor</span>
                  <div className="editor-actions">
                    <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="language-selector"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="typescript">TypeScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="rust">Rust</option>
                    </select>
                    <button 
                      onClick={() => setEditableCode('')}
                      className="clear-btn"
                      title="Clear Editor"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <textarea
                  ref={codeInputRef}
                  value={editableCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="Write or paste your code here for analysis..."
                  className="code-editor"
                  rows={15}
                />
                
                {/* Real-time Code Suggestions */}
                {showSuggestions && currentSuggestions.length > 0 && (
                  <div className="code-suggestions">
                    <div className="suggestions-header">
                      <span>💡 Smart Suggestions</span>
                      <button 
                        onClick={() => setShowSuggestions(false)}
                        className="close-suggestions"
                      >
                        ✕
                      </button>
                    </div>
                    {currentSuggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <div className="suggestion-info">
                          <span className="suggestion-type">{suggestion.type}</span>
                          <span className="suggestion-desc">{suggestion.description}</span>
                          <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                        </div>
                        <button 
                          onClick={() => applySuggestion(suggestion)}
                          className="apply-suggestion-btn"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Prompt Templates */}
        <div className="advanced-prompts">
          <div className="prompts-header">
            <h3>🚀 Advanced Tools</h3>
                          <div className="header-actions">
                <button 
                  className="split-view-toggle"
                  onClick={toggleSplitView}
                  title={showSplitView ? 'Hide Split View' : 'Show Split View'}
                >
                  {showSplitView ? '📱 Single View' : '🖥️ Split View'}
                </button>
                <button 
                  className="test-split-btn"
                  onClick={forceSplitView}
                  title="Force Split View (Test)"
                >
                  🧪 Test Split
                </button>
                <span className="debug-info">Split View: {showSplitView ? 'ON' : 'OFF'}</span>
              </div>
          </div>
          
          <div className="prompt-templates">
            {promptTemplates.map(template => (
              <button 
                key={template.id}
                className={`prompt-template ${template.category}`}
                onClick={() => handlePromptTemplate(template)}
                title={template.description}
              >
                {template.name}
        </button>
            ))}
          </div>
        </div>



        {/* File List - Only in Demo Mode */}
        {!enterpriseMode && uploadedFiles.length > 0 && (
          <div className="file-list">
            <h3>📁 Files for Analysis</h3>
            <div className="files">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  <button className="analyze-btn">🔍 Analyze</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed', 
            left: showContextMenu.x, 
            top: showContextMenu.y,
            zIndex: 1000
          }}
        >
          <button onClick={() => handleRenameChat(showContextMenu.chatId)} className="context-menu-item">
            ✏️ Rename Chat
          </button>
          <button onClick={() => handleDuplicateChat(showContextMenu.chatId)} className="context-menu-item">
            📋 Duplicate Chat
          </button>
          <button onClick={() => togglePinChat(showContextMenu.chatId)} className="context-menu-item">
            📌 Toggle Pin
          </button>
          <button onClick={() => deleteChat(showContextMenu.chatId)} className="context-menu-item delete">
            🗑️ Delete Chat
          </button>
        </div>
      )}
    </div>
  )
}

export default App
