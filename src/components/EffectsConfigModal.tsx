'use client';

import React, { useState, useEffect } from 'react';
import { VHSv1Params, HalationBloomParams, CathodeRayParams } from '@/types/video';

interface EffectsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  effect: 'cathode-ray' | 'halation-bloom' | 'vhs-v1';
  onSaveConfig: (config: any) => void;
  initialConfig?: any;
}

// Halation-Bloom presets based on documentation
const HALATION_BLOOM_PRESETS = {
  default: {
    name: "Default",
    description: "Standard halation & bloom settings",
    config: {
      effect_mode: 'Both' as const,
      intensity: 1.0,
      threshold: 0.6,
      radius: 15,
      chromatic_aberration: 0.5,
      temporal_variation: 0.2,
      red_offset: 1.2
    }
  },
  classicFilm: {
    name: "Classic Film",
    description: "Authentic film halation characteristics",
    config: {
      effect_mode: 'Halation' as const,
      intensity: 1.2,
      threshold: 0.75,
      radius: 15,
      chromatic_aberration: 0.3,
      temporal_variation: 0.1,
      red_offset: 1.4
    }
  },
  anamorphic: {
    name: "Anamorphic Look",
    description: "Modern cinematic anamorphic lens effect",
    config: {
      effect_mode: 'Both' as const,
      intensity: 1.8,
      threshold: 0.45,
      radius: 30,
      chromatic_aberration: 1.2,
      temporal_variation: 0.3,
      red_offset: 1.3
    }
  },
  subtle: {
    name: "Subtle Enhancement",
    description: "Light bloom for gentle enhancement",
    config: {
      effect_mode: 'Bloom' as const,
      intensity: 0.5,
      threshold: 0.85,
      radius: 8,
      chromatic_aberration: 0.1,
      temporal_variation: 0.05,
      red_offset: 1.0
    }
  },
  dreamSequence: {
    name: "Dream Sequence",
    description: "Ethereal glow for fantasy scenes",
    config: {
      effect_mode: 'Both' as const,
      intensity: 2.5,
      threshold: 0.35,
      radius: 50,
      chromatic_aberration: 0.8,
      temporal_variation: 0.6,
      red_offset: 1.5
    }
  }
};

// Cathode Ray presets based on documentation
const CATHODE_RAY_PRESETS = {
  static: {
    name: "Static",
    description: "Consistent effect intensity",
    config: {
      preset: 'static' as const,
      custom_expression: 'sin(t/10) * 0.1 + 0.2',
      screen_curvature: 0.2,
      scanline_intensity: 0.3,
      glow_amount: 0.2,
      color_bleeding: 0.15,
      noise_amount: 0.05
    }
  },
  fluctuating: {
    name: "Fluctuating",
    description: "Subtle pulsing effect",
    config: {
      preset: 'fluctuating' as const,
      custom_expression: 'sin(t/5) * 0.15 + 0.25',
      screen_curvature: 0.25,
      scanline_intensity: 0.4,
      glow_amount: 0.3,
      color_bleeding: 0.2,
      noise_amount: 0.08
    }
  },
  degraded: {
    name: "Degraded",
    description: "Gradually reduces intensity over time",
    config: {
      preset: 'degraded' as const,
      custom_expression: 'max(0.1, 1 - t/200)',
      screen_curvature: 0.3,
      scanline_intensity: 0.5,
      glow_amount: 0.15,
      color_bleeding: 0.25,
      noise_amount: 0.12
    }
  },
  custom: {
    name: "Custom",
    description: "User-defined mathematical expression",
    config: {
      preset: 'custom' as const,
      custom_expression: 'sin(t/10) * 0.1 + 0.2',
      screen_curvature: 0.2,
      scanline_intensity: 0.3,
      glow_amount: 0.2,
      color_bleeding: 0.15,
      noise_amount: 0.05
    }
  }
};

// VHS v1 presets based on documentation
const VHS_PRESETS = {
  default: {
    name: "Default",
    description: "Standard VHS effect settings",
    config: {
      luma_compression_rate: 1.0,
      luma_noise_sigma: 30.0,
      luma_noise_mean: 0.0,
      chroma_compression_rate: 1.0,
      chroma_noise_intensity: 10.0,
      vertical_blur: 1,
      horizontal_blur: 1,
      border_size: 1.7,
      generations: 3
    }
  },
  authentic: {
    name: "Authentic VHS",
    description: "Realistic VHS tape characteristics",
    config: {
      luma_compression_rate: 2.0,
      luma_noise_sigma: 20.0,
      luma_noise_mean: 0.0,
      chroma_compression_rate: 2.5,
      chroma_noise_intensity: 15.0,
      vertical_blur: 3,
      horizontal_blur: 3,
      border_size: 2.0,
      generations: 3
    }
  },
  extreme: {
    name: "Extreme Degradation",
    description: "Heavy distortion and multiple generation loss",
    config: {
      luma_compression_rate: 6.0,
      luma_noise_sigma: 60.0,
      luma_noise_mean: 5.0,
      chroma_compression_rate: 5.5,
      chroma_noise_intensity: 40.0,
      vertical_blur: 7,
      horizontal_blur: 5,
      border_size: 4.0,
      generations: 8
    }
  },
  subtle: {
    name: "Subtle Effects",
    description: "Light VHS touch with minimal distortion",
    config: {
      luma_compression_rate: 1.2,
      luma_noise_sigma: 8.0,
      luma_noise_mean: 0.0,
      chroma_compression_rate: 1.3,
      chroma_noise_intensity: 5.0,
      vertical_blur: 1,
      horizontal_blur: 1,
      border_size: 1.0,
      generations: 2
    }
  }
};

export const EffectsConfigModal: React.FC<EffectsConfigModalProps> = ({
  isOpen,
  onClose,
  effect,
  onSaveConfig,
  initialConfig
}) => {
  const [config, setConfig] = useState<VHSv1Params | HalationBloomParams | CathodeRayParams>(
    effect === 'vhs-v1' ? VHS_PRESETS.default.config : 
    effect === 'halation-bloom' ? HALATION_BLOOM_PRESETS.default.config :
    CATHODE_RAY_PRESETS.static.config
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(effect === 'cathode-ray' ? 'static' : 'default');

  // Load saved config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(`effects-config-${effect}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        setSelectedPreset('custom');
      } catch (error) {
        console.error('Failed to parse saved config:', error);
      }
    } else if (initialConfig) {
      setConfig(initialConfig);
      setSelectedPreset('custom');
    } else {
      // Set default config based on effect type
      const defaultConfig = effect === 'vhs-v1' 
        ? VHS_PRESETS.default.config 
        : effect === 'halation-bloom' 
        ? HALATION_BLOOM_PRESETS.default.config
        : CATHODE_RAY_PRESETS.static.config;
      setConfig(defaultConfig);
      setSelectedPreset(effect === 'cathode-ray' ? 'static' : 'default');
    }
  }, [effect, initialConfig]);

  const handlePresetChange = (presetKey: string) => {
    if (presetKey === 'custom') return;
    
    if (effect === 'vhs-v1') {
      const preset = VHS_PRESETS[presetKey as keyof typeof VHS_PRESETS];
      if (preset) {
        setConfig(preset.config);
        setSelectedPreset(presetKey);
      }
    } else if (effect === 'halation-bloom') {
      const preset = HALATION_BLOOM_PRESETS[presetKey as keyof typeof HALATION_BLOOM_PRESETS];
      if (preset) {
        setConfig(preset.config);
        setSelectedPreset(presetKey);
      }
    } else if (effect === 'cathode-ray') {
      const preset = CATHODE_RAY_PRESETS[presetKey as keyof typeof CATHODE_RAY_PRESETS];
      if (preset) {
        setConfig(preset.config);
        setSelectedPreset(presetKey);
      }
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
    localStorage.setItem(`effects-config-${effect}`, JSON.stringify(config));
    
    // Pass config back to parent
    onSaveConfig(config);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = effect === 'vhs-v1' 
      ? VHS_PRESETS.default.config 
      : effect === 'halation-bloom'
      ? HALATION_BLOOM_PRESETS.default.config
      : CATHODE_RAY_PRESETS.static.config;
    setConfig(defaultConfig);
    setSelectedPreset(effect === 'cathode-ray' ? 'static' : 'default');
    localStorage.removeItem(`effects-config-${effect}`);
  };

  if (!isOpen) return null;

  const isVHS = effect === 'vhs-v1';
  const isHalationBloom = effect === 'halation-bloom';
  const isCathodeRay = effect === 'cathode-ray';
  const presets = isVHS ? VHS_PRESETS : isHalationBloom ? HALATION_BLOOM_PRESETS : CATHODE_RAY_PRESETS;
  const themeColors = isVHS 
    ? { gradient: 'from-green-50 to-emerald-50', primary: 'green', slider: 'slider-green' }
    : isHalationBloom 
    ? { gradient: 'from-orange-50 to-pink-50', primary: 'orange', slider: 'slider-orange' }
    : { gradient: 'from-purple-50 to-blue-50', primary: 'purple', slider: 'slider-purple' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b bg-gradient-to-r ${themeColors.gradient}`}>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isVHS ? 'VHS v1 Effect Configuration' : 
               isHalationBloom ? 'Halation & Bloom Effect Configuration' : 
               'Cathode Ray Effect Configuration'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isVHS 
                ? 'Customize parameters for authentic VHS tape effects'
                : isHalationBloom
                ? 'Customize parameters for cinematic lighting effects'
                : 'Customize parameters for retro CRT monitor effects'
              }
            </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPreset === key
                      ? `border-${themeColors.primary}-500 bg-${themeColors.primary}-50 ring-2 ring-${themeColors.primary}-200`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-medium text-gray-800">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                </button>
              ))}
              {selectedPreset === 'custom' && (
                <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 ring-2 ring-blue-200">
                  <h4 className="font-medium text-gray-800">Custom</h4>
                  <p className="text-sm text-gray-600 mt-1">Your modified settings</p>
                </div>
              )}
            </div>
          </div>

          {/* Parameter Controls */}
          {isVHS ? (
            // VHS v1 Parameters
            <div className="space-y-8">
              {/* Luma Controls */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Luma (Brightness) Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compression Rate: {(config as VHSv1Params).luma_compression_rate.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={(config as VHSv1Params).luma_compression_rate}
                      onChange={(e) => handleParameterChange('luma_compression_rate', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Controls brightness compression artifacts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noise Sigma: {(config as VHSv1Params).luma_noise_sigma.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="100.0"
                      step="1.0"
                      value={(config as VHSv1Params).luma_noise_sigma}
                      onChange={(e) => handleParameterChange('luma_noise_sigma', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Intensity of brightness noise</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noise Mean: {(config as VHSv1Params).luma_noise_mean.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="-50.0"
                      max="50.0"
                      step="1.0"
                      value={(config as VHSv1Params).luma_noise_mean}
                      onChange={(e) => handleParameterChange('luma_noise_mean', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Brightness offset of noise</p>
                  </div>
                </div>
              </div>

              {/* Chroma Controls */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                  Chroma (Color) Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compression Rate: {(config as VHSv1Params).chroma_compression_rate.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={(config as VHSv1Params).chroma_compression_rate}
                      onChange={(e) => handleParameterChange('chroma_compression_rate', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Controls color bleeding and artifacts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noise Intensity: {(config as VHSv1Params).chroma_noise_intensity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="50.0"
                      step="1.0"
                      value={(config as VHSv1Params).chroma_noise_intensity}
                      onChange={(e) => handleParameterChange('chroma_noise_intensity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Intensity of color distortion</p>
                  </div>
                </div>
              </div>

              {/* Blur and Distortion */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
                  Blur & Distortion
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vertical Blur: {(config as VHSv1Params).vertical_blur}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="21"
                      step="2"
                      value={(config as VHSv1Params).vertical_blur}
                      onChange={(e) => handleParameterChange('vertical_blur', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Vertical smearing effect</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horizontal Blur: {(config as VHSv1Params).horizontal_blur}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="21"
                      step="2"
                      value={(config as VHSv1Params).horizontal_blur}
                      onChange={(e) => handleParameterChange('horizontal_blur', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Horizontal smearing effect</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Border Size: {(config as VHSv1Params).border_size.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="10.0"
                      step="0.1"
                      value={(config as VHSv1Params).border_size}
                      onChange={(e) => handleParameterChange('border_size', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Right edge black border</p>
                  </div>
                </div>
              </div>

              {/* Effect Intensity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
                  Effect Intensity
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generations: {(config as VHSv1Params).generations}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={(config as VHSv1Params).generations}
                    onChange={(e) => handleParameterChange('generations', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                  />
                  <p className="text-xs text-gray-500 mt-1">Simulates multiple VHS copy generations</p>
                </div>
              </div>
            </div>
          ) : isCathodeRay ? (
            // Cathode Ray Parameters
            <div className="space-y-8">
              {/* Preset Mode */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Preset Mode
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode: {(config as CathodeRayParams).preset}
                  </label>
                  <select
                    value={(config as CathodeRayParams).preset}
                    onChange={(e) => handleParameterChange('preset', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 text-gray-700"
                  >
                    <option value="static">Static</option>
                    <option value="fluctuating">Fluctuating</option>
                    <option value="degraded">Degraded</option>
                    <option value="custom">Custom</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose between preset modes or custom expression</p>
                </div>
              </div>

              {/* Custom Expression (only shown when preset is custom) */}
              {(config as CathodeRayParams).preset === 'custom' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                    Custom Expression
                  </h3>
                  <div className="max-w-2xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mathematical Expression
                    </label>
                    <input
                      type="text"
                      value={(config as CathodeRayParams).custom_expression}
                      onChange={(e) => handleParameterChange('custom_expression', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 text-gray-700 font-mono"
                      placeholder="sin(t/10) * 0.1 + 0.2"
                    />
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      <p><strong>Variable:</strong> <code>t</code> = current frame index</p>
                      <p><strong>Functions:</strong> sin, cos, max, min, random, etc.</p>
                      <p><strong>Examples:</strong> <code>sin(t/5) * 0.15 + 0.25</code>, <code>max(0.1, 1 - t/200)</code></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Display Effects */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-violet-500 rounded-full mr-2"></span>
                  Display Effects
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screen Curvature: {(config as CathodeRayParams).screen_curvature.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={(config as CathodeRayParams).screen_curvature}
                      onChange={(e) => handleParameterChange('screen_curvature', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    <p className="text-xs text-gray-500 mt-1">Screen bulging/curvature typical of CRT displays</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scanline Intensity: {(config as CathodeRayParams).scanline_intensity.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={(config as CathodeRayParams).scanline_intensity}
                      onChange={(e) => handleParameterChange('scanline_intensity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    <p className="text-xs text-gray-500 mt-1">Visibility of horizontal scanlines</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Glow Amount: {(config as CathodeRayParams).glow_amount.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={(config as CathodeRayParams).glow_amount}
                      onChange={(e) => handleParameterChange('glow_amount', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bloom/glow around bright areas</p>
                  </div>
                </div>
              </div>

              {/* Color & Noise */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Color & Noise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Bleeding: {(config as CathodeRayParams).color_bleeding.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={(config as CathodeRayParams).color_bleeding}
                      onChange={(e) => handleParameterChange('color_bleeding', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    <p className="text-xs text-gray-500 mt-1">Color fringing between adjacent pixels</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noise Amount: {(config as CathodeRayParams).noise_amount.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="0.5"
                      step="0.01"
                      value={(config as CathodeRayParams).noise_amount}
                      onChange={(e) => handleParameterChange('noise_amount', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    <p className="text-xs text-gray-500 mt-1">Random screen interference and grain</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Halation-Bloom Parameters
            <div className="space-y-8">
              {/* Effect Mode */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Effect Mode
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode: {(config as HalationBloomParams).effect_mode}
                  </label>
                  <select
                    value={(config as HalationBloomParams).effect_mode}
                    onChange={(e) => handleParameterChange('effect_mode', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-gray-700"
                  >
                    <option value="Halation">Halation</option>
                    <option value="Bloom">Bloom</option>
                    <option value="Both">Both</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose between halation, bloom, or both effects</p>
                </div>
              </div>

              {/* Main Controls */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                  Main Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intensity: {(config as HalationBloomParams).intensity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={(config as HalationBloomParams).intensity}
                      onChange={(e) => handleParameterChange('intensity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <p className="text-xs text-gray-500 mt-1">Overall strength of the effect</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Threshold: {(config as HalationBloomParams).threshold.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={(config as HalationBloomParams).threshold}
                      onChange={(e) => handleParameterChange('threshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <p className="text-xs text-gray-500 mt-1">Brightness level where effect begins</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Radius: {(config as HalationBloomParams).radius}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={(config as HalationBloomParams).radius}
                      onChange={(e) => handleParameterChange('radius', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <p className="text-xs text-gray-500 mt-1">Size of the glow effect</p>
                  </div>
                </div>
              </div>

              {/* Color Controls */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-rose-500 rounded-full mr-2"></span>
                  Color Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Red Offset: {(config as HalationBloomParams).red_offset.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={(config as HalationBloomParams).red_offset}
                      onChange={(e) => handleParameterChange('red_offset', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <p className="text-xs text-gray-500 mt-1">Spread of red channel in halation</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chromatic Aberration: {(config as HalationBloomParams).chromatic_aberration.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={(config as HalationBloomParams).chromatic_aberration}
                      onChange={(e) => handleParameterChange('chromatic_aberration', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <p className="text-xs text-gray-500 mt-1">Color separation around bright areas</p>
                  </div>
                </div>
              </div>

              {/* Animation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Animation
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporal Variation: {(config as HalationBloomParams).temporal_variation.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={(config as HalationBloomParams).temporal_variation}
                    onChange={(e) => handleParameterChange('temporal_variation', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                  />
                  <p className="text-xs text-gray-500 mt-1">How much the effect varies over time</p>
                </div>
              </div>
            </div>
          )}
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
                className={`px-6 py-2 text-white rounded-lg transition-colors ${
                  isVHS 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : isHalationBloom
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
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
