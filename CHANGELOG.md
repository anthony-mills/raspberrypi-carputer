# Nomadic Pi ChangeLog

## Unreleased


## [1.1] - 23/10/2017

### Added 

- Functionality to switch to fullscreen mode in the application menu

- Location specific values such as heading and altitude simply show as a dash when unavailable now rather than "unknown" or "N/A" to provide a more consistent user experience.

### Fixes

- The interface no longer reports that it has a GPS fix unless it has an actual location fix. The interface was prone to report it had a fix in the past while having sky view of a couple of satellites but no actual location fix.

- Border styling issues with the menu items on the official Raspiberry Pi screen

## [1.0] - 01/10/2017

- Initial release