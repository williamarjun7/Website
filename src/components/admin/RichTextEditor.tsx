import { useRef, useState, useCallback, type ComponentType } from 'react';
import { Bold, Italic, Heading, List, Link, Image, AlignLeft, ListOrdered } from 'lucide-react';
import MediaPicker from './MediaPicker';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    label?: string;
}

const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: ComponentType<{ size?: number }>; onClick: () => void; title: string }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
    >
        <Icon size={16} />
    </button>
);

const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
};

const RichTextEditor = ({ value, onChange, placeholder = 'Write content here...', minHeight = 250, label }: RichTextEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const handleChange = useCallback(() => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            if (html !== value) onChange(html);
        }
    }, [onChange, value]);

    const execAndUpdate = useCallback((command: string, value?: string) => {
        exec(command, value);
        handleChange();
    }, [handleChange]);

    const handleBold = () => execAndUpdate('bold');
    const handleItalic = () => execAndUpdate('italic');
    const handleHeading = () => execAndUpdate('formatBlock', 'h3');
    const handleBulletList = () => execAndUpdate('insertUnorderedList');
    const handleOrderedList = () => execAndUpdate('insertOrderedList');
    const handleAlignLeft = () => execAndUpdate('justifyLeft');

    const handleLink = useCallback(() => {
        if (showLinkInput && linkUrl) {
            execAndUpdate('createLink', linkUrl);
            setShowLinkInput(false);
            setLinkUrl('');
        } else {
            setShowLinkInput(true);
        }
    }, [showLinkInput, linkUrl, execAndUpdate]);

    const handleImageSelect = (url: string) => {
        execAndUpdate('insertImage', url);
        setShowMediaPicker(false);
    };

    const handleInput = () => {
        handleChange();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
        const sanitized = DOMPurify.sanitize(text);
        exec('insertHTML', sanitized);
        handleChange();
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {label && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                </div>
            )}
            <div className="flex flex-wrap gap-0.5 px-3 py-2 bg-white border-b border-gray-200" role="toolbar" aria-label="Text formatting">
                <ToolbarButton icon={Bold} onClick={handleBold} title="Bold" />
                <ToolbarButton icon={Italic} onClick={handleItalic} title="Italic" />
                <ToolbarButton icon={Heading} onClick={handleHeading} title="Heading" />
                <ToolbarButton icon={List} onClick={handleBulletList} title="Bullet List" />
                <ToolbarButton icon={ListOrdered} onClick={handleOrderedList} title="Numbered List" />
                <ToolbarButton icon={AlignLeft} onClick={handleAlignLeft} title="Align Left" />
                <ToolbarButton icon={Link} onClick={handleLink} title="Link" />
                <ToolbarButton icon={Image} onClick={() => setShowMediaPicker(true)} title="Image" />
            </div>
            {showLinkInput && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="input flex-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLink();
                            if (e.key === 'Escape') setShowLinkInput(false);
                        }}
                    />
                    <button onClick={handleLink} className="btn-primary text-xs px-3 py-1.5" aria-label="Apply link">Apply</button>
                    <button onClick={() => setShowLinkInput(false)} className="text-xs text-gray-500 hover:text-gray-700" aria-label="Cancel link">Cancel</button>
                </div>
            )}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onPaste={handlePaste}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value || '') }}
                className="px-4 py-3 focus:outline-none prose prose-sm max-w-none text-gray-700 leading-relaxed"
                style={{ minHeight: `${minHeight}px` }}
                data-placeholder={placeholder}
                role="textbox"
                aria-multiline="true"
                aria-label={label || 'Rich text editor'}
            />
            {showMediaPicker && (
                <MediaPicker
                    onSelect={handleImageSelect}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}
        </div>
    );
};

export default RichTextEditor;