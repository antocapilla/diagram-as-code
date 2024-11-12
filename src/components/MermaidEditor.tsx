'use client';

import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Download,
  Share2,
  FileText,
  ZoomIn,
  ZoomOut,
  Move,
  Wand2,
  Maximize2,
  Undo,
  Redo,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

const defaultCode = `graph LR
  %% Style definitions
  classDef deviceStyle fill:#fff,stroke:#333,stroke-width:2px
  
  %% Main devices
  HOTSPOT[HotSpot]
  MICROTIK[MicroTik]
  OLT[OLT]
  SWITCH[SWITCH]
  SWH[SWH]
  AP[WiFi AP]
  EKCAST[EkCast]
  ANTO[Anto's PC]
  VODAFONE[Vodafone]`;

export default function MermaidEditor() {
  const [mermaidCode, setMermaidCode] = useState(defaultCode);
  const [diagramTitle, setDiagramTitle] = useState('Network Diagram: Office');
  const [aiPrompt, setAiPrompt] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [separatorPosition, setSeparatorPosition] = useState(50);
  const [theme, setTheme] = useState('default');
  const [direction, setDirection] = useState('LR');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [fullScreenSvg, setFullScreenSvg] = useState('');
  const [fullScreenZoom, setFullScreenZoom] = useState(1);
  const [fullScreenPan, setFullScreenPan] = useState({ x: 0, y: 0 });
  const mermaidRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [history, setHistory] = useState<string[]>([defaultCode]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme,
      securityLevel: 'loose',
    });
  }, [theme]);

  const renderDiagram = async (code: string, elementId: string) => {
    try {
      const { svg } = await mermaid.render(elementId, code);
      return svg;
    } catch (error) {
      console.error('Error rendering diagram:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'There was a problem rendering the diagram. Please check the syntax.',
      });
      return null;
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (mermaidRef.current) {
        const svg = await renderDiagram(mermaidCode, 'mermaid-diagram');
        if (svg) {
          mermaidRef.current.innerHTML = svg;
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mermaidCode, toast]);

  useEffect(() => {
    const renderFullScreenDiagram = async () => {
      if (isFullScreenOpen) {
        const svg = await renderDiagram(
          mermaidCode,
          'full-screen-mermaid-diagram'
        );
        if (svg) {
          setFullScreenSvg(svg);
        }
      }
    };

    renderFullScreenDiagram();
  }, [mermaidCode, isFullScreenOpen]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setMermaidCode(newCode);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newCode]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(mermaidCode)
      .then(() => {
        toast({
          description: 'Code copied to clipboard',
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          description: 'Error copying code',
        });
      });
  };

  const downloadSVG = () => {
    const svgData = mermaidRef.current?.innerHTML;
    if (svgData) {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mermaid-diagram.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          direction: direction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate diagram');
      }

      const generatedCode = await response.text();
      setMermaidCode(generatedCode);
      setHistory((prev) => [...prev, generatedCode]);
      setHistoryIndex((prev) => prev + 1);
      toast({
        description: 'Mermaid code generated with AI',
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate diagram with AI. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  const handleSeparatorMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startSeparatorPosition = separatorPosition;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newPosition =
        startSeparatorPosition + (diff / window.innerWidth) * 100;
      setSeparatorPosition(Math.max(20, Math.min(80, newPosition)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setMermaidCode(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setMermaidCode(history[historyIndex + 1]);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    mermaid.initialize({ theme: value });
  };

  const handleDirectionChange = (value: string) => {
    setDirection(value);
    const updatedCode = mermaidCode.replace(
      /^(graph|flowchart)\s+[TBLR][TBLR]?/,
      `graph ${value}`
    );
    setMermaidCode(updatedCode);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), updatedCode]);
    setHistoryIndex((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isFullScreenOpen) {
      setFullScreenZoom(1);
      setFullScreenPan({ x: 0, y: 0 });
    }
  }, [isFullScreenOpen]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b">
        <div className="flex items-center gap-2 p-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                File
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                New <ChevronRight className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem>Make a copy</DropdownMenuItem>
              <DropdownMenuItem>Open Recent</DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>PNG</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadSVG}>SVG</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem>Embed</DropdownMenuItem>
              <DropdownMenuItem>Rename</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Input
            value={diagramTitle}
            onChange={(e) => setDiagramTitle(e.target.value)}
            className="max-w-xs"
            placeholder="Diagram title"
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate diagram with AI</DialogTitle>
              </DialogHeader>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the diagram you want to generate..."
                rows={4}
              />
              <Button onClick={generateWithAI} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </DialogContent>
          </Dialog>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="forest">Forest</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={handleDirectionChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Graph direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LR">Left to Right</SelectItem>
              <SelectItem value="RL">Right to Left</SelectItem>
              <SelectItem value="TB">Top to Bottom</SelectItem>
              <SelectItem value="BT">Bottom to Top</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div
          style={{ width: `${separatorPosition}%` }}
          className="overflow-hidden"
        >
          <div className="relative h-full flex">
            <div
              ref={lineNumbersRef}
              className="select-none bg-[#f8f9fa] text-gray-400 p-2 text-right pr-4 font-mono text-sm overflow-hidden"
              style={{
                width: '3rem',
                fontSize: '14px',
                lineHeight: '1.5rem',
              }}
            >
              {mermaidCode.split('\n').map((_, i) => (
                <div key={i} className="h-6">
                  {i + 1}
                </div>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden">
              <textarea
                ref={editorRef}
                value={mermaidCode}
                onChange={handleCodeChange}
                onScroll={(e) => {
                  if (lineNumbersRef.current) {
                    lineNumbersRef.current.scrollTop =
                      e.currentTarget.scrollTop;
                  }
                }}
                className="absolute inset-0 w-full h-full resize-none font-mono p-2 bg-[#f0f8ff] text-black leading-6 outline-none"
                spellCheck="false"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5rem',
                  tabSize: 4,
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="w-2 bg-gray-200 cursor-col-resize hover:bg-gray-300"
          onMouseDown={handleSeparatorMouseDown}
        />
        <div
          ref={diagramContainerRef}
          style={{ width: `${100 - separatorPosition}%` }}
          className="overflow-hidden relative"
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div ref={mermaidRef} className="mermaid"></div>
          </div>
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetZoom}>
              <Move className="h-4 w-4" />
            </Button>
          </div>
          <Dialog onOpenChange={setIsFullScreenOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full w-[90vw] h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{diagramTitle}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden p-4 relative">
                <div
                  className="h-full w-full"
                  style={{
                    transform: `scale(${fullScreenZoom}) translate(${fullScreenPan.x}px, ${fullScreenPan.y}px)`,
                    transformOrigin: '0 0',
                    transition: 'transform 0.3s ease-out',
                  }}
                  onMouseDown={(e) => {
                    const startX = e.clientX - fullScreenPan.x;
                    const startY = e.clientY - fullScreenPan.y;
                    const handleMouseMove = (e: MouseEvent) => {
                      setFullScreenPan({
                        x: e.clientX - startX,
                        y: e.clientY - startY,
                      });
                    };
                    const handleMouseUp = () => {
                      document.removeEventListener(
                        'mousemove',
                        handleMouseMove
                      );
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  dangerouslySetInnerHTML={{ __html: fullScreenSvg }}
                />
                <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFullScreenZoom((prev) => Math.max(prev - 0.1, 0.5))
                    }
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFullScreenZoom((prev) => Math.min(prev + 0.1, 2))
                    }
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setFullScreenZoom(1);
                      setFullScreenPan({ x: 0, y: 0 });
                    }}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
