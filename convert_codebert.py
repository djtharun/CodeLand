#!/usr/bin/env python3
"""
CodeBERT to ONNX Converter - Browser Compatible Version
Converts Microsoft's CodeBERT model to ONNX format with embedded weights
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any

# -----------------------------
# Directory Creation
# -----------------------------
def create_directories() -> None:
    """Create necessary directories"""
    dirs: List[str] = ['models', 'models/quantized']
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {dir_path}")

# -----------------------------
# Model Download & Conversion
# -----------------------------
def download_and_convert_model(model_name: str = "microsoft/codebert-base", quantize: bool = True) -> bool:
    """Download CodeBERT and convert to ONNX with embedded weights"""
    try:
        import torch
        from transformers import RobertaModel, RobertaTokenizer
        
        print(f"\n📥 Downloading {model_name} (may take a few minutes)...")
        
        model = RobertaModel.from_pretrained(model_name)
        tokenizer = RobertaTokenizer.from_pretrained(model_name)
        model.eval()
        
        # --- Save Vocab and Config ---
        vocab_path: str = 'models/vocab.json'
        with open(vocab_path, 'w', encoding='utf-8') as f:
            json.dump(tokenizer.get_vocab(), f, indent=2)
        print(f"✓ Vocabulary saved: {vocab_path}")
        
        config_path: str = 'models/tokenizer_config.json'
        config: Dict[str, Any] = {
            'vocab_size': tokenizer.vocab_size,
            'max_length': 512,
            'pad_token': tokenizer.pad_token,
            'bos_token': tokenizer.bos_token,
            'eos_token': tokenizer.eos_token,
            'unk_token': tokenizer.unk_token,
            'mask_token': tokenizer.mask_token,
            'model_max_length': tokenizer.model_max_length
        }
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        print(f"✓ Tokenizer config saved: {config_path}")
        
        # --- Prepare Dummy Inputs and Export ---
        batch_size: int = 1
        seq_length: int = 512
        dummy_input: torch.Tensor = torch.randint(0, tokenizer.vocab_size, (batch_size, seq_length), dtype=torch.long)
        attention_mask: torch.Tensor = torch.ones(batch_size, seq_length, dtype=torch.long)
        
        onnx_path: str = 'models/codebert-base.onnx'
        temp_onnx_path: str = 'models/codebert-temp.onnx'
        
        print("\n📄 Converting to ONNX (embedding weights inside model)...")
        
        # First export to temporary location
        torch.onnx.export(
            model,
            (dummy_input, attention_mask), 
            temp_onnx_path,
            input_names=['input_ids', 'attention_mask'],
            output_names=['last_hidden_state'], 
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence'},
                'attention_mask': {0: 'batch_size', 1: 'sequence'},
                'last_hidden_state': {0: 'batch_size', 1: 'sequence'},
            },
            opset_version=14,
            do_constant_folding=True,
            export_params=True
        )
        
        # Load and save with embedded data (for browser compatibility)
        import onnx
        print("🔄 Embedding external data into model file...")
        onnx_model = onnx.load(temp_onnx_path)
        
        # Save with all data embedded (no external files) - CRITICAL for browser
        onnx.save(
            onnx_model, 
            onnx_path,
            save_as_external_data=False  # CRITICAL: Embed all data in single file
        )
        
        # Clean up temporary file
        if os.path.exists(temp_onnx_path):
            os.remove(temp_onnx_path)
            print("✓ Cleaned up temporary files")
        
        # Clean up any .data files that might have been created
        data_file = f"{temp_onnx_path}.data"
        if os.path.exists(data_file):
            os.remove(data_file)
        
        # Also check for main model data file
        main_data_file = f"{onnx_path}.data"
        if os.path.exists(main_data_file):
            os.remove(main_data_file)
            print("✓ Removed external data file (embedded in main model)")
        
        # --- Verification ---
        file_size_mb: float = os.path.getsize(onnx_path) / (1024*1024)
        print(f"✓ ONNX model exported: {onnx_path} ({file_size_mb:.1f} MB)")
        
        # Verify ONNX model
        onnx_model = onnx.load(onnx_path)
        onnx.checker.check_model(onnx_model) 
        print("✓ ONNX model verification passed")
        
        # Check that no external data is referenced
        has_external_data = any(
            hasattr(tensor, 'external_data') and len(tensor.external_data) > 0
            for tensor in onnx_model.graph.initializer
        )
        if has_external_data:
            print("⚠️  WARNING: Model still has external data references!")
        else:
            print("✓ Confirmed: All weights embedded in model file")
        
        # Optional: quantization
        if quantize:
            try:
                from onnxruntime.quantization import quantize_dynamic, QuantType
                quant_path: str = 'models/codebert-base-quantized.onnx'
                
                print("\n📉 Starting dynamic quantization (CPU)...")
                quantize_dynamic(
                    model_input=onnx_path,
                    model_output=quant_path,
                    weight_type=QuantType.QUInt8
                )
                
                quant_size_mb: float = os.path.getsize(quant_path) / (1024*1024)
                reduction: float = ((file_size_mb - quant_size_mb) / file_size_mb) * 100
                print(f"✓ Quantized model saved: {quant_path} ({quant_size_mb:.1f} MB, {reduction:.1f}% smaller)")
            except Exception as e:
                print(f"⚠️  Quantization failed: {e}")
        
        print("\n✅ Conversion complete!")
        print(f"Files created:")
        print(f"  - {onnx_path} (browser-compatible)")
        if quantize and os.path.exists('models/codebert-base-quantized.onnx'):
            print(f"  - models/codebert-base-quantized.onnx")
        print(f"  - {vocab_path}")
        print(f"  - {config_path}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc(file=sys.stdout)
        return False

# -----------------------------
# Test ONNX Model
# -----------------------------
def test_model() -> bool:
    """Test the converted ONNX model using onnxruntime"""
    try:
        import onnxruntime as ort
        import numpy as np
        
        model_paths: List[str] = [
            'models/codebert-base-quantized.onnx',
            'models/codebert-base.onnx'
        ]
        
        success: bool = False
        for model_path in model_paths:
            if not os.path.exists(model_path):
                continue
            
            print(f"\n🧪 Testing: {model_path}")
            session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            
            input_ids = np.random.randint(0, 50265, (1, 512), dtype=np.int64)
            attention_mask = np.ones((1, 512), dtype=np.int64)
            
            outputs = session.run(
                None,
                {'input_ids': input_ids, 'attention_mask': attention_mask}
            )
            
            expected_shape = (1, 512, 768)
            if outputs[0].shape == expected_shape:
                print(f"  ✓ Model loaded and tested successfully")
                print(f"    Output shape: {outputs[0].shape}")
                print(f"    Execution providers: {session.get_providers()}")
                success = True
            else:
                print(f"  ❌ Test failed: Unexpected output shape {outputs[0].shape}")
        
        if not success:
            print("⚠️  No models found to test or test failed.")
            return False
            
        return True
    
    except Exception as e:
        print(f"\n❌ Error testing ONNX model: {e}")
        import traceback
        traceback.print_exc(file=sys.stdout)
        return False

# -----------------------------
# Main Entry
# -----------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("CodeBERT to ONNX Converter - Browser Compatible")
    print("=" * 60)
    
    create_directories()
    
    if not download_and_convert_model():
        sys.exit(1)
    
    test_model()
    
    print("\n" + "=" * 60)
    print("✅ Ready for browser deployment!")
    print("=" * 60)