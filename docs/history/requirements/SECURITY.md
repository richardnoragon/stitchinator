# Security

Requirements draft; controls described here are not yet implemented or verified.

## Access and privacy

Stitchinator is a private, single-user application with no login. Access must be restricted to the computer running Docker. Container port publication must not expose the application to the LAN or internet. Exact network configuration and browser request protections remain to be designed and tested.

Everyday operation must work offline. Internet is permitted for downloading Docker, the application, and updates. Runtime assets must be local.

## Data protection

Projects and manually entered yarn inventory are stored locally. Autosave, crash recovery, and portable project files are required. Full collection backups run on the first day of each calendar month with daily incremental backups. They cover projects, revision history, and yarn inventory. Store backups outside the container in a user-selected folder, retaining three monthly cycles and their daily incrementals. Run overdue backups at startup; warn persistently and retry when a destination becomes available. Restore by date/time after making a safety backup of the current collection. Retention must preserve dependencies needed to restore retained backups. Autosave alone is not a separate backup.

Imported project files and photos require validation; limits and implementation remain undecided.

## Support and reporting

Supported versions and a private vulnerability reporting route have not yet been established.

## Backup implementation note

Current backups are unencrypted JSON stored in the prepared host folder. Its setup script restricts the folder to owner/group access and uses a destination marker; the container has a configurable supplementary group. Restore refuses missing dependencies, checksum mismatches, and failed pre-restore safety backups. Backup contents must be valid project JSON; unreadable current projects prevent making the required safety snapshot. See README for operational limits.
