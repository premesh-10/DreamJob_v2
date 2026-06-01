import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function SecurePdfViewer({ url, onClose }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [isBlackout, setIsBlackout] = useState(false);

    // Security: Prevent Screenshots & Screen Recording (Same as VideoPlayer)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey)) {
                setIsBlackout(true);
                setTimeout(() => setIsBlackout(false), 3000);
                try { navigator.clipboard.writeText('Screenshots are disabled for premium content.'); } catch (err) {}
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'PrintScreen') {
                setIsBlackout(true);
                setTimeout(() => setIsBlackout(false), 3000);
            }
        };
        const handleBlur = () => setIsBlackout(true);
        const handleFocus = () => setIsBlackout(false);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 protected-content">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-sm">
                <div className="text-white font-medium">Protected Document</div>
                <div className="flex items-center gap-4 text-white">
                    <button 
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 transition"
                    >
                        Previous
                    </button>
                    <span className="text-sm">
                        Page {pageNumber} of {numPages || '--'}
                    </span>
                    <button 
                        onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
                        disabled={pageNumber >= (numPages || 1)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 transition"
                    >
                        Next
                    </button>
                    <button onClick={onClose} className="ml-4 p-2 text-slate-400 hover:text-white transition">
                        ✖
                    </button>
                </div>
            </div>

            {/* Viewer Area */}
            <div 
                className="flex-1 overflow-auto bg-slate-900 flex justify-center p-6"
                onContextMenu={(e) => e.preventDefault()} // Disable right-click
                style={{ userSelect: 'none' }} // Disable text selection
            >
                {isBlackout ? (
                    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                        <div className="text-4xl mb-3">🛡️</div>
                        <h3 className="text-xl font-bold">Screenshots Disabled</h3>
                        <p className="text-slate-400 mt-2">Screen recording and screenshots are not permitted for premium course content.</p>
                    </div>
                ) : (
                    <div className="relative shadow-2xl">
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="text-white p-10">Loading secure document...</div>}
                            error={<div className="text-red-400 p-10">Failed to load secure document.</div>}
                        >
                            <Page 
                                pageNumber={pageNumber} 
                                renderTextLayer={false} // Prevents text selection/copying via HTML overlay
                                renderAnnotationLayer={false} 
                                className="border border-slate-700"
                                width={Math.min(window.innerWidth - 100, 900)}
                            />
                        </Document>
                        {/* Overlay to block any drag-and-drop or iframe-based extraction */}
                        <div className="absolute inset-0 z-10 pointer-events-none"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SecurePdfViewer;
