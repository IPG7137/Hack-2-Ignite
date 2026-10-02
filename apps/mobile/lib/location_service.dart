import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'auth_service.dart';

class LocationContext {
  final double? latitude;
  final double? longitude;
  final String? locality;
  final String? subLocality;
  final String? city;
  final String? district;
  final String? state;
  final String currentAreaLabel;
  final String municipalityTitle;
  final bool hasGps;
  final bool permissionDenied;
  final String source; // 'gps', 'profile', 'fallback'

  const LocationContext({
    this.latitude,
    this.longitude,
    this.locality,
    this.subLocality,
    this.city,
    this.district,
    this.state,
    required this.currentAreaLabel,
    required this.municipalityTitle,
    required this.hasGps,
    required this.permissionDenied,
    required this.source,
  });

  static const LocationContext defaultContext = LocationContext(
    currentAreaLabel: 'Location unavailable',
    municipalityTitle: 'Municipal Grievance Redressal Portal',
    hasGps: false,
    permissionDenied: false,
    source: 'fallback',
  );
}

class LocationService extends ChangeNotifier {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  static LocationService get instance => _instance;

  LocationService._internal();

  LocationContext _currentContext = LocationContext.defaultContext;
  bool _isLocating = false;

  LocationContext get context => _currentContext;
  double? get latitude => _currentContext.latitude;
  double? get longitude => _currentContext.longitude;
  String get currentAreaLabel => _currentContext.currentAreaLabel;
  String get municipalityTitle => _currentContext.municipalityTitle;
  bool get hasGps => _currentContext.hasGps;
  bool get isLocating => _isLocating;
  bool get permissionDenied => _currentContext.permissionDenied;

  /// Initialize and resolve device location immediately
  Future<LocationContext> resolveLocation({bool forceRefresh = false}) async {
    if (_isLocating && !forceRefresh) {
      return _currentContext;
    }

    _isLocating = true;
    notifyListeners();

    try {
      debugPrint('📍 Resolving device location...');

      // 1. Check if location service is enabled
      bool serviceEnabled = false;
      try {
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
      } catch (e) {
        debugPrint('⚠️ isLocationServiceEnabled check error: $e');
      }

      if (!serviceEnabled && !kIsWeb) {
        debugPrint('ℹ️ GPS location services are disabled on device');
        _currentContext = _resolveProfileOrFallback(permissionDenied: false);
        _isLocating = false;
        notifyListeners();
        return _currentContext;
      }

      // 2. Check permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint('ℹ️ Location permission denied by citizen ($permission)');
        _currentContext = _resolveProfileOrFallback(permissionDenied: true);
        _isLocating = false;
        notifyListeners();
        return _currentContext;
      }

      // 3. Obtain real GPS position
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 6),
        );
      } catch (posErr) {
        debugPrint('ℹ️ getCurrentPosition timeout/error ($posErr), attempting last known position...');
        try {
          position = await Geolocator.getLastKnownPosition();
        } catch (_) {}
      }

      if (position == null) {
        debugPrint('ℹ️ No GPS coordinates obtained from device');
        _currentContext = _resolveProfileOrFallback(permissionDenied: false);
        _isLocating = false;
        notifyListeners();
        return _currentContext;
      }

      final lat = position.latitude;
      final lng = position.longitude;
      debugPrint('✅ Real GPS obtained: lat=$lat, lng=$lng');

      // 4. Reverse geocode coordinates to locality / city / district
      String? locality;
      String? subLocality;
      String? city;
      String? district;
      String? state;

      try {
        final placemarks = await placemarkFromCoordinates(lat, lng);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          locality = place.locality?.isNotEmpty == true ? place.locality : place.subLocality;
          subLocality = place.subLocality;
          district = place.subAdministrativeArea?.isNotEmpty == true 
              ? place.subAdministrativeArea 
              : place.administrativeArea;
          state = place.administrativeArea;
          city = place.locality?.isNotEmpty == true
              ? place.locality
              : (place.subAdministrativeArea?.isNotEmpty == true ? place.subAdministrativeArea : null);
        }
      } catch (geoErr) {
        debugPrint('ℹ️ Reverse geocoding error ($geoErr), using coordinate representation');
      }

      // 5. Construct user-facing labels
      final municipalName = _deriveMunicipalityName(city: city, district: district);
      final areaLabel = _deriveAreaLabel(
        locality: locality,
        subLocality: subLocality,
        city: city,
        district: district,
        state: state,
        lat: lat,
        lng: lng,
      );

      _currentContext = LocationContext(
        latitude: lat,
        longitude: lng,
        locality: locality,
        subLocality: subLocality,
        city: city,
        district: district,
        state: state,
        currentAreaLabel: areaLabel,
        municipalityTitle: municipalName,
        hasGps: true,
        permissionDenied: false,
        source: 'gps',
      );

      debugPrint('🏛️ Dynamic Municipality: $municipalName | Area: $areaLabel');
    } catch (e) {
      debugPrint('❌ Unexpected error in location resolution: $e');
      _currentContext = _resolveProfileOrFallback(permissionDenied: false);
    } finally {
      _isLocating = false;
      notifyListeners();
    }

    return _currentContext;
  }

  /// Fallback to authenticated citizen profile ward/district or neutral municipal title
  LocationContext _resolveProfileOrFallback({required bool permissionDenied}) {
    final authService = AuthService.instance;
    final profileDistrict = authService.userDistrict?.trim();
    final profileWard = authService.userWard?.trim();

    String municipalTitle = 'Municipal Grievance Redressal Portal';
    String areaLabel = permissionDenied ? 'Location access not enabled' : 'Location unavailable';

    if (profileDistrict != null &&
        profileDistrict.isNotEmpty &&
        profileDistrict.toLowerCase() != 'municipal area' &&
        profileDistrict.toLowerCase() != 'general district') {
      municipalTitle = '$profileDistrict Municipal Portal';
      if (profileWard != null && profileWard.isNotEmpty) {
        areaLabel = '$profileWard, $profileDistrict';
      } else {
        areaLabel = profileDistrict;
      }
      return LocationContext(
        district: profileDistrict,
        currentAreaLabel: areaLabel,
        municipalityTitle: municipalTitle,
        hasGps: false,
        permissionDenied: permissionDenied,
        source: 'profile',
      );
    }

    return LocationContext(
      currentAreaLabel: areaLabel,
      municipalityTitle: municipalTitle,
      hasGps: false,
      permissionDenied: permissionDenied,
      source: 'fallback',
    );
  }

  String _deriveMunicipalityName({String? city, String? district}) {
    final name = city ?? district;
    if (name != null && name.trim().isNotEmpty) {
      final clean = name.trim();
      if (clean.toLowerCase().contains('corporation') ||
          clean.toLowerCase().contains('municipal') ||
          clean.toLowerCase().contains('portal')) {
        return clean;
      }
      return '$clean Municipal Portal';
    }
    return 'Municipal Grievance Redressal Portal';
  }

  String _deriveAreaLabel({
    String? locality,
    String? subLocality,
    String? city,
    String? district,
    String? state,
    required double lat,
    required double lng,
  }) {
    final parts = <String>[];
    if (subLocality != null && subLocality.isNotEmpty) {
      parts.add(subLocality);
    }
    if (locality != null && locality.isNotEmpty && locality != subLocality) {
      parts.add(locality);
    } else if (city != null && city.isNotEmpty && !parts.contains(city)) {
      parts.add(city);
    }
    if (district != null && district.isNotEmpty && !parts.contains(district) && parts.length < 2) {
      parts.add(district);
    }
    if (state != null && state.isNotEmpty && parts.length < 2) {
      parts.add(state);
    }

    if (parts.isNotEmpty) {
      return parts.take(2).join(', ');
    }
    return '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
  }
}
