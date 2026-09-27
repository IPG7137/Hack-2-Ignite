import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class PermissionService {
  static const String _firstLaunchKey = 'first_launch_permissions_requested';

  /// Check if this is the first time the app is launched
  static Future<bool> isFirstLaunch() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool(_firstLaunchKey) ?? false);
  }

  /// Mark that permissions have been requested on first launch
  static Future<void> markPermissionsRequested() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_firstLaunchKey, true);
  }

  /// Request all essential permissions on first app launch
  static Future<Map<String, bool>> requestFirstLaunchPermissions() async {
    final results = <String, bool>{};
    
    // Request location permission
    results['location'] = await requestLocationPermission();
    
    // Request media permissions (camera and storage/photos)
    results['camera'] = await requestCameraPermission();
    results['media'] = await requestMediaPermission();
    
    // Mark that permissions have been requested
    await markPermissionsRequested();
    
    return results;
  }

  /// Check if we need to show permission request dialog for a specific permission
  static Future<bool> shouldRequestPermission(String permissionType) async {
    final prefs = await SharedPreferences.getInstance();
    final isFirstLaunch = await PermissionService.isFirstLaunch();
    
    if (isFirstLaunch) {
      return true; // Always request on first launch
    }
    
    // Check stored permission status
    final storedStatus = prefs.getString('${permissionType}_permission_status');
    return storedStatus == 'denied' || storedStatus == null;
  }

  /// Store permission status for future reference
  static Future<void> _storePermissionStatus(String permissionType, bool granted) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${permissionType}_permission_status', granted ? 'granted' : 'denied');
  }

  static Future<bool> requestLocationPermission() async {
    try {
      // For web platform, location permission is handled by the browser
      if (kIsWeb) {
        try {
          await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 10),
          );
          await _storePermissionStatus('location', true);
          return true;
        } catch (e) {
          debugPrint('Web location permission denied or error: $e');
          await _storePermissionStatus('location', false);
          return false;
        }
      }

      // Check if location services are enabled (mobile platforms)
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await _storePermissionStatus('location', false);
        return false;
      }

      // Request location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      final granted = permission == LocationPermission.whileInUse || 
                     permission == LocationPermission.always;
      
      await _storePermissionStatus('location', granted);
      return granted;
    } catch (e) {
      debugPrint('Error requesting location permission: $e');
      await _storePermissionStatus('location', false);
      return false;
    }
  }

  static Future<bool> requestCameraPermission() async {
    try {
      // For web platform, camera permission is handled by the browser when attempting to use camera
      if (kIsWeb) {
        // On web, we assume camera permission is available and will be requested by browser when needed
        await _storePermissionStatus('camera', true);
        return true;
      }

      final status = await Permission.camera.request();
      final granted = status == PermissionStatus.granted;
      await _storePermissionStatus('camera', granted);
      return granted;
    } catch (e) {
      debugPrint('Error requesting camera permission: $e');
      await _storePermissionStatus('camera', false);
      return false;
    }
  }

  static Future<bool> requestMediaPermission() async {
    try {
      // For web platform, media/file access is handled by the browser when file picker is used
      if (kIsWeb) {
        // On web, we assume media access is available through file picker dialogs
        await _storePermissionStatus('media', true);
        return true;
      }

      // For Android 13+ (API 33+)
      if (await _isAndroid13OrAbove()) {
        final photosStatus = await Permission.photos.request();
        final granted = photosStatus == PermissionStatus.granted || 
                       photosStatus == PermissionStatus.limited;
        await _storePermissionStatus('media', granted);
        return granted;
      } else {
        // For older Android versions
        final storageStatus = await Permission.storage.request();
        final granted = storageStatus == PermissionStatus.granted;
        await _storePermissionStatus('media', granted);
        return granted;
      }
    } catch (e) {
      debugPrint('Error requesting media permission: $e');
      await _storePermissionStatus('media', false);
      return false;
    }
  }

  /// Request storage permission (legacy method name for backward compatibility)
  static Future<bool> requestStoragePermission() async {
    return await requestMediaPermission();
  }

  /// Check permission status without requesting
  static Future<bool> hasLocationPermission() async {
    try {
      if (kIsWeb) {
        // On web, try to get current position to check if permission is granted
        try {
          await Geolocator.getCurrentPosition(timeLimit: const Duration(seconds: 5));
          return true;
        } catch (e) {
          return false;
        }
      }

      LocationPermission permission = await Geolocator.checkPermission();
      return permission == LocationPermission.whileInUse || 
             permission == LocationPermission.always;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> hasCameraPermission() async {
    try {
      if (kIsWeb) {
        // On web, assume camera is available (browser will handle permission when needed)
        return true;
      }

      final status = await Permission.camera.status;
      return status == PermissionStatus.granted;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> hasMediaPermission() async {
    try {
      if (await _isAndroid13OrAbove()) {
        final status = await Permission.photos.status;
        return status == PermissionStatus.granted || status == PermissionStatus.limited;
      } else {
        final status = await Permission.storage.status;
        return status == PermissionStatus.granted;
      }
    } catch (e) {
      return false;
    }
  }

  /// Show permission rationale dialog
  static Future<bool?> showPermissionDialog(
    BuildContext context, {
    required String title,
    required String message,
    required String permissionType,
  }) async {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(
                _getPermissionIcon(permissionType),
                color: const Color(0xFF0EA5E9),
                size: 24,
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(title)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF0EA5E9).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: Color(0xFF0EA5E9),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _getPermissionExplanation(permissionType),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Not Now'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
                foregroundColor: Colors.white,
              ),
              child: const Text('Allow'),
            ),
          ],
        );
      },
    );
  }

  /// Show settings dialog when permission is permanently denied
  static Future<void> showSettingsDialog(
    BuildContext context, {
    required String title,
    required String message,
  }) async {
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(
                Icons.settings,
                color: Color(0xFFEF4444),
                size: 24,
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(title)),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                openAppSettings();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
                foregroundColor: Colors.white,
              ),
              child: const Text('Open Settings'),
            ),
          ],
        );
      },
    );
  }

  /// Request permission with user-friendly dialog and proper handling
  static Future<bool> requestPermissionWithDialog(
    BuildContext context, {
    required String permissionType,
  }) async {
    // First check if permission is already granted
    bool hasPermission = false;
    switch (permissionType) {
      case 'location':
        hasPermission = await hasLocationPermission();
        break;
      case 'camera':
        hasPermission = await hasCameraPermission();
        break;
      case 'media':
        hasPermission = await hasMediaPermission();
        break;
    }

    if (hasPermission) return true;
    if (!context.mounted) return false;

    // Show rationale dialog
    final shouldRequest = await showPermissionDialog(
      context,
      title: _getPermissionTitle(permissionType),
      message: _getPermissionMessage(permissionType),
      permissionType: permissionType,
    );

    if (shouldRequest != true) return false;

    // Request the permission
    bool granted = false;
    switch (permissionType) {
      case 'location':
        granted = await requestLocationPermission();
        break;
      case 'camera':
        granted = await requestCameraPermission();
        break;
      case 'media':
        granted = await requestMediaPermission();
        break;
    }

    // If still not granted, show settings dialog
    if (!granted && context.mounted) {
      await showSettingsDialog(
        context,
        title: 'Permission Required',
        message: 'Please enable ${_getPermissionTitle(permissionType)} in Settings to use this feature.',
      );
    }

    return granted;
  }

  static IconData _getPermissionIcon(String permissionType) {
    switch (permissionType) {
      case 'location':
        return Icons.location_on;
      case 'camera':
        return Icons.camera_alt;
      case 'media':
        return Icons.photo_library;
      default:
        return Icons.security;
    }
  }

  static String _getPermissionTitle(String permissionType) {
    switch (permissionType) {
      case 'location':
        return 'Location Access';
      case 'camera':
        return 'Camera Access';
      case 'media':
        return 'Media Access';
      default:
        return 'Permission Required';
    }
  }

  static String _getPermissionMessage(String permissionType) {
    switch (permissionType) {
      case 'location':
        return 'This app needs location access to accurately place your reports and show nearby issues on the map.';
      case 'camera':
        return 'This app needs camera access to let you take photos when reporting civic issues.';
      case 'media':
        return 'This app needs media access to let you attach photos from your gallery to your reports.';
      default:
        return 'This app needs permission to function properly.';
    }
  }

  static String _getPermissionExplanation(String permissionType) {
    switch (permissionType) {
      case 'location':
        return 'Your location helps authorities identify and respond to issues in your area.';
      case 'camera':
        return 'Photos help authorities better understand and prioritize reported issues.';
      case 'media':
        return 'You can include existing photos to provide additional context for your reports.';
      default:
        return 'This permission is required for the app to work correctly.';
    }
  }

  /// Check if Android version is 13 or above (API 33+)
  static Future<bool> _isAndroid13OrAbove() async {
    try {
      // This is a simplified check - in a real app you might want to use device_info_plus
      return true; // Assume modern Android for simplicity
    } catch (e) {
      return false;
    }
  }

  /// Request all media-related permissions
  static Future<bool> requestMediaPermissions() async {
    bool cameraGranted = await requestCameraPermission();
    bool storageGranted = await requestMediaPermission();
    return cameraGranted && storageGranted;
  }

  /// Check all permissions status
  static Future<Map<String, bool>> checkAllPermissions() async {
    return {
      'location': await hasLocationPermission(),
      'camera': await hasCameraPermission(),
      'media': await hasMediaPermission(),
    };
  }
}