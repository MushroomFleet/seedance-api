'use client';

import React, { useState, useEffect } from 'react';
import { UpscaleParams } from '@/types/video';

interface UpscaleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: UpscaleParams) => void;
  initialConfig?: UpscaleParams;
}

// Upscale presets based on VideoInterlacedV2.md usage tips
const UPSCALE_PRESETS = {
  qualityUpscaling: {
    name: "Quality Upscaling",
    description: "Best for general video enhancement with smooth upscaling",
    config: {
      input_height: 720,
      input_width: 1280,
      field_order: 'top_first' as const,
      scale_factor: 1.5,
      blend_factor: 0.35,
      motion_compensation: 'advanced' as const,
      interpolation_mode: 'bicubic' as const,
      deinterlace_method: 'blend' as const,
      field_strength: 1.0,
      temporal_radius: 2,
      edge_enhancement: 0.1
    }
  },
  retroVideoEffects: {
    name: "Retro Video Effects",
    description: "Emphasizes interlaced look for vintage video aesthetic",
    config: {
      input_height: 720,
      input_width: 1280,
      field_order: 'top_first' as const,
      scale_factor: 1.5,
      blend_factor: 0.15,
      motion_compensation: 'basic' as const,
      interpolation_mode: 'bilinear' as const,
      deinterlace_method: 'bob' as const,
      field_strength: 1.2,
      temporal_radius: 1,
      edge_enhancement: 0.4
    }
  },
  artisticEffects: {
    name: "Artistic Effects",
    description: "Creative styling with enhanced field separation and motion",
    config: {
      input_height: 720,
      input_width: 1280,
      field_order: 'top_first' as const,
      scale_factor: 2.0,
      blend_factor: 0.3,
      motion_compensation: 'advanced' as const,
      interpolation_mode: 'bicubic' as const,
      deinterlace_method: 'weave' as const,
      field_strength: 1.8,
      temporal_radius: 2,
      edge_enhancement: 0.6
    }
  },
  maxQuality: {
    name: "Maximum Quality",
    description: "Highest quality settings for detailed content upscaling",
    config: {
      input_height: 720,
      input_width: 1280,
      field_order: 'top_first' as const,
      scale_factor: 2.0,
      blend_factor: 0.4,
      motion_compensation: 'advanced' as const,
      interpolation_mode: 'bicubic' as const,
      deinterlace_method: 'blend' as const,
      field_strength: 1.0,
      temporal_radius: 3,
      edge_enhancement: 0.2
    }
  },
  performance: {
    name: "Performance",
    description: "Faster processing with good quality balance",
    config: {
      input_height: 720,
      input_width: 1280,
      field_order: 'top_first' as const,
      scale_factor: 1.5,
      blend_factor: 0.25,
      motion_compensation: 'basic' as const,
      interpolation_mode: 'bilinear' as const,
      deinterlace_method: 'blend' as const,
      field_strength: 1.0,
      temporal_radius: 1,
      edge_enhancement: 0.0
    }
  }
};

export const UpscaleConfigModal: React.FC<UpscaleConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
  initialConfig
}) => {
  const [config, setConfig] = useState<UpscaleParams>(UPSCALE_PRESETS.qualityUpscaling.config);
  const [selectedPreset, setSelectedPreset] = useState<string>('qualityUpscaling');

  // Load saved config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('upscale-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        setSelectedPreset('custom');
      } catch (error) {
        console.error('Failed to parse saved upscale config:', error);
      }
    } else if (initialConfig) {
      setConfig(initialConfig);
      setSelectedPreset('custom');
    } else {
      setConfig(UPSCALE_PRESETS.qualityUpscaling.config);
      setSelectedPreset('qualityUpscaling');
    }
  }, [initialConfig]);

  const handlePresetChange = (presetKey: string) => {
    if (presetKey === 'custom') return;
    
    const preset = UPSCALE_PRESETS[presetKey as keyof typeof UPSCALE_PRESETS];
    if (preset) {
      setConfig(preset.config);
      setSelectedPreset(presetKey);
    }
  };

  const handleParameterChange = (param: string, value: number | string) => {
    setConfig(prev => ({
      ...prev,
      [param]: value
    }));
    setSelectedPreset('custom');
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('upscale-config', JSON.stringify(config));
    
    // Pass config back to parent
    onSaveConfig(config);
    onClose();
  };

  const handleReset = () => {
    setConfig(UPSCALE_PRESETS.qualityUpscaling.config);
    setSelectedPreset('qualityUpscaling');
    localStorage.removeItem('upscale-config');
  };

  const getEstimatedProcessingTime = () => {
    let timeMultiplier = 1;
    
    // Scale factor impact
    timeMultiplier *= config.scale_factor;
    
    // Motion compensation impact
    if (config.motion_compensation === 'advanced') timeMultiplier *= 1.5;
    else if (config.motion_compensation === 'basic') timeMultiplier *= 1.2;
    
    // Interpolation impact
    if (config.interpolation_mode === 'bicubic') timeMultiplier *= 1.3;
    
    // Temporal radius impact
    timeMultiplier *= (1 + (config.temporal_radius - 1) * 0.2);
    
    // Edge enhancement impact
    if (config.edge_enhancement > 0) timeMultiplier *= 1.1;
    
    const baseTime = 30; // seconds for a 5-second video
    const estimatedTime = Math.round(baseTime * timeMultiplier);
    
    if (estimatedTime < 60) {
      return `~${estimatedTime}s`;
    } else {
      const minutes = Math.floor(estimatedTime / 60);
      const seconds = estimatedTime % 60;
      return `~${minutes}m ${seconds}s`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Interlaced Upscaling Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Advanced controls for video interlaced upscaling with motion compensation
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="text-blue-600 font-medium">
                Estimated processing time: {getEstimatedProcessingTime()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Presets Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(UPSCALE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPreset === key
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-medium text-gray-800">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                </button>
              ))}
              {selectedPreset === 'custom' && (
                <div className="p-4 rounded-lg border-2 border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200">
                  <h4 className="font-medium text-gray-800">Custom</h4>
                  <p className="text-sm text-gray-600 mt-1">Your modified settings</p>
                </div>
              )}
            </div>
          </div>

          {/* Parameter Controls */}
          <div className="space-y-8">
            {/* Resolution & Scale */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Resolution & Scale
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Input Height: {config.input_height}px
                  </label>
                  <input
                    type="range"
                    min="480"
                    max="4320"
                    step="16"
                    value={config.input_height}
                    onChange={(e) => handleParameterChange('input_height', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Base height before upscaling</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Input Width: {config.input_width}px
                  </label>
                  <input
                    type="range"
                    min="640"
                    max="7680"
                    step="16"
                    value={config.input_width}
                    onChange={(e) => handleParameterChange('input_width', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Base width before upscaling</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scale Factor: {config.scale_factor.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={config.scale_factor}
                    onChange={(e) => handleParameterChange('scale_factor', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Output: {Math.round(config.input_width * config.scale_factor)} × {Math.round(config.input_height * config.scale_factor)}
                  </p>
                </div>
              </div>
            </div>

            {/* Field Processing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></span>
                Field Processing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Order
                  </label>
                  <select
                    value={config.field_order}
                    onChange={(e) => handleParameterChange('field_order', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-gray-700"
                  >
                    <option value="top_first">Top First</option>
                    <option value="bottom_first">Bottom First</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Which field is processed first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blend Factor: {config.blend_factor.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={config.blend_factor}
                    onChange={(e) => handleParameterChange('blend_factor', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">How much adjacent fields blend together</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Strength: {config.field_strength.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.1"
                    value={config.field_strength}
                    onChange={(e) => handleParameterChange('field_strength', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Intensity of field separation effect</p>
                </div>
              </div>
            </div>

            {/* Motion & Interpolation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                Motion & Interpolation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motion Compensation
                  </label>
                  <select
                    value={config.motion_compensation}
                    onChange={(e) => handleParameterChange('motion_compensation', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-gray-700"
                  >
                    <option value="none">None</option>
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Type of motion smoothing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interpolation Mode
                  </label>
                  <select
                    value={config.interpolation_mode}
                    onChange={(e) => handleParameterChange('interpolation_mode', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-gray-700"
                  >
                    <option value="bilinear">Bilinear</option>
                    <option value="bicubic">Bicubic</option>
                    <option value="nearest">Nearest</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Algorithm used for scaling</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporal Radius: {config.temporal_radius}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={config.temporal_radius}
                    onChange={(e) => handleParameterChange('temporal_radius', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Adjacent frames for motion compensation</p>
                </div>
              </div>
            </div>

            {/* Deinterlacing & Enhancement */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Deinterlacing & Enhancement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deinterlace Method
                  </label>
                  <select
                    value={config.deinterlace_method}
                    onChange={(e) => handleParameterChange('deinterlace_method', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-gray-700"
                  >
                    <option value="blend">Blend</option>
                    <option value="bob">Bob</option>
                    <option value="weave">Weave</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">How fields are combined</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edge Enhancement: {config.edge_enhancement.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={config.edge_enhancement}
                    onChange={(e) => handleParameterChange('edge_enhancement', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                  <p className="text-xs text-gray-500 mt-1">Additional sharpening to combat blur</p>
                </div>
              </div>
            </div>

            {/* Method Explanations */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Method Explanations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Motion Compensation:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>None:</strong> No motion compensation</li>
                    <li><strong>Basic:</strong> Simple field-based smoothing</li>
                    <li><strong>Advanced:</strong> Temporal-aware with adjacent frames</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Deinterlace Methods:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>Blend:</strong> Smoothly combines fields</li>
                    <li><strong>Bob:</strong> Line doubling with field separation</li>
                    <li><strong>Weave:</strong> Interleaves with additional processing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Interpolation:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>Bilinear:</strong> Smooth, balanced quality</li>
                    <li><strong>Bicubic:</strong> Higher quality, slight ringing</li>
                    <li><strong>Nearest:</strong> Sharp, pixelated look</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Field Order:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>Top First:</strong> Even lines processed first</li>
                    <li><strong>Bottom First:</strong> Odd lines processed first</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset to Default
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
