import os
import gc
import uuid
import shutil
import traceback
from werkzeug.utils import secure_filename
import librosa
import numpy as np

def ensure_directory_exists(directory_path):
    """Ensure a directory exists, creating it if necessary."""
    os.makedirs(directory_path, exist_ok=True)
    return directory_path

def generate_unique_filename(original_filename):
    """Generate a unique filename with UUID prefix."""
    file_uuid = str(uuid.uuid4())
    secure_name = secure_filename(original_filename)
    return file_uuid, f"{file_uuid}_{secure_name}"

def save_uploaded_file(file_obj, upload_folder, original_filename=None):
    """Save an uploaded file with a unique name and return the path."""
    if original_filename is None:
        original_filename = file_obj.filename
        
    file_uuid, unique_filename = generate_unique_filename(original_filename)
    file_path = os.path.join(upload_folder, unique_filename)
    
    file_obj.save(file_path)
    return file_uuid, file_path

def cleanup_file(file_path):
    """Safely remove a file if it exists."""
    print(f"Attempting to clean up file: {file_path}")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"Successfully removed file: {file_path}")
            return True
        except Exception as e:
            print(f"Error cleaning up file {file_path}: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    else:
        print(f"File not found for cleanup: {file_path}")
        return False

def analyze_audio_file(file_path):
    """Analyze audio file to detect tempo and key."""
    try:
        print(f"=== ANALYZE_AUDIO_FILE FUNCTION CALLED ===")
        print(f"File path: {file_path}")
        
        # Verify the file exists
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return {
                'success': False,
                'error': f"File not found: {file_path}"
            }
            
        # Verify the file is readable
        if not os.access(file_path, os.R_OK):
            print(f"File is not readable: {file_path}")
            return {
                'success': False,
                'error': f"File is not readable: {file_path}"
            }
            
        # Load the audio file with librosa using a lower sample rate and mono
        print(f"Loading audio file: {file_path}")
        try:
            y, sr = librosa.load(file_path, sr=22050, mono=True)
            print(f"Audio loaded successfully, sample rate: {sr}, length: {len(y)}")
        except Exception as load_error:
            print(f"Failed to load audio file: {str(load_error)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f"Failed to load audio file: {str(load_error)}"
            }
        
        # Get onset envelope with reduced complexity
        print("Calculating onset envelope")
        try:
            onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
            print(f"Onset envelope calculated, length: {len(onset_env)}")
        except Exception as onset_error:
            print(f"Failed to calculate onset envelope: {str(onset_error)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f"Failed to calculate onset envelope: {str(onset_error)}"
            }
        
        # Free up memory from raw audio data
        del y
        gc.collect()
        
        # Dynamic tempo detection with simplified parameters
        print("Detecting tempo")
        try:
            dtempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr, aggregate=None,
                                      hop_length=512, start_bpm=120)
            print(f"Tempo detected, values: {dtempo[:5]}...")
        except Exception as tempo_error:
            print(f"Failed to detect tempo: {str(tempo_error)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f"Failed to detect tempo: {str(tempo_error)}"
            }
        
        # Calculate tempos more efficiently
        try:
            tempo_frequencies = np.bincount(np.round(dtempo).astype(int))
            possible_tempos = np.where(tempo_frequencies > 0)[0]
            print(f"Possible tempos: {possible_tempos[:5]}...")
        except Exception as tempo_calc_error:
            print(f"Failed to calculate tempo frequencies: {str(tempo_calc_error)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f"Failed to calculate tempo frequencies: {str(tempo_calc_error)}"
            }
        
        # Free up memory
        del onset_env
        del dtempo
        gc.collect()
        
        # Find the most likely tempo
        tempo_candidates = []
        for tempo in possible_tempos:
            score = (tempo_frequencies[tempo] if tempo < len(tempo_frequencies) else 0)
            score += (tempo_frequencies[tempo//2] if tempo//2 < len(tempo_frequencies) else 0)
            score += (tempo_frequencies[tempo*2] if tempo*2 < len(tempo_frequencies) else 0)
            tempo_candidates.append((tempo, score))
        
        # Get the best tempo
        if not tempo_candidates:
            print("No tempo candidates found, using default 120 BPM")
            best_tempo = 120  # Default if no tempo detected
        else:
            best_tempo = sorted(tempo_candidates, key=lambda x: x[1], reverse=True)[0][0]
            print(f"Best tempo: {best_tempo} BPM")
        
        # Load audio again for key detection with very low duration
        print("Detecting key")
        key = "Unknown"  # Default value
        try:
            y, sr = librosa.load(file_path, sr=22050, duration=30, mono=True)
            print(f"Audio reloaded for key detection, sample rate: {sr}, length: {len(y)}")
            
            # Detect key with simplified parameters
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512, n_chroma=12)
            key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            key = key_names[np.argmax(np.mean(chroma, axis=1))]
            print(f"Key detected: {key}")
            
            # Clean up
            del y
            del chroma
        except Exception as key_error:
            print(f"Error detecting key: {str(key_error)}")
            import traceback
            traceback.print_exc()
            # Continue with the default key value
        
        gc.collect()
        
        print(f"Analysis complete: Tempo={best_tempo} BPM, Key={key}")
        return {
            'success': True,
            'tempo': int(round(float(best_tempo))),
            'key': key
        }
    
    except Exception as e:
        print(f"Error during audio analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': f"Error analyzing audio: {str(e)}"
        }

def convert_audio(input_path, output_path, output_format):
    """Convert audio file to specified format using ffmpeg."""
    import subprocess
    import os
    
    try:
        print(f"=== CONVERT_AUDIO FUNCTION CALLED ===")
        print(f"Input path: {input_path}")
        print(f"Output path: {output_path}")
        print(f"Output format: {output_format}")
        
        # Ensure the output directory exists
        output_dir = os.path.dirname(output_path)
        print(f"Ensuring output directory exists: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Build the command as a single string
        if output_format == 'mp3':
            cmd = f'ffmpeg -i "{input_path}" -codec:a libmp3lame -qscale:a 2 -y "{output_path}"'
        elif output_format == 'wav':
            cmd = f'ffmpeg -i "{input_path}" -codec:a pcm_s16le -y "{output_path}"'
        elif output_format == 'flac':
            cmd = f'ffmpeg -i "{input_path}" -codec:a flac -y "{output_path}"'
        else:
            print(f"Invalid format: {output_format}")
            return False
        
        print(f"Command: {cmd}")
        
        # Run the command with shell=True
        print("Starting subprocess...")
        process = subprocess.Popen(
            cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for the process to complete
        print("Waiting for process to complete...")
        stdout, stderr = process.communicate()
        
        # Check if the process was successful
        print(f"Process return code: {process.returncode}")
        if process.returncode != 0:
            stderr_text = stderr.decode('utf-8', errors='replace')
            print(f"FFmpeg error: {stderr_text}")
            return False
        
        # Check if the output file was created
        print(f"Checking if output file exists: {output_path}")
        if not os.path.exists(output_path):
            print(f"Output file was not created: {output_path}")
            return False
            
        print(f"Conversion successful: {output_path}")
        return True
    except Exception as e:
        print(f"General conversion error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False 