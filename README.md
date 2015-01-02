# About

This is a playground for the [Arduino Yun][1], the AVR Microcontroller and [Embedded Linux][2] combo.

I'm doing some experiments with the concept: Moving the Microcontroller programming as is, from the AVR/C++ world,
to the OpenWrt/JavaScript world.

That is possible on the [Yun][1], because the two are wired together with a serial line and there is a protocol/software-library called [Firmata][3] for both sides, to connect them.

# Reasoning

## Gains

- More expressive power
- More dynamic development
- Easier integration with tons of libraries
- Easier re-programming

### More expressive power

The powerful features of JavaScript like closures, first-class function objects and higher-order functions makes it possible for programmers to express their ideas better, on a more abstract level.

Using these tools, one can capture repeating patterns of computation and abstract them away more easily. That is a gain compared to C++ which provides less powerful tools for building abstractions.

### More dynamic development

JavaScript is a dynamic language, one can change object properties, add or remove methods on the fly.

Also using the REPL it is possibly to tinker with the application while it's running. It's a huge gain compared to the tedious compile, build and upload cycle doing traditianal AVR development.

You can experiment with the AVR on the fly!

### Easier integration with tons of libraries

The server-side JavaScript implementation [Node.js][4] is provided for the [linux][2] on the Yun.

Node.js is very popular and there is a huge community behind constantly providing improvement and growing number of open-source libraries. These libraries are easy to use in Node, with `npm`, the package management system for Node.

### Easier re-programming

You only need the Arduino application to program the firmata sketch on the MCU once. After this, you can simply transfer new JavaScript code to the Linux side to update the program for your project.

## Losses

- Performance loss
- Reliability

### Performance loss

For realtime applications the bottleneck introduced by the serial communication/protocol between the MCU and the Linux chip might be a problem.

### Reliability

Since it is a much more complex setup using a Linux box to constantly communicate with the MCU on a serial line using the Firmata protocol compared to a more simpler design using an AVR MCU only, it meas more dangers to the reliable operation.

Also a [race condition issue](http://playground.arduino.cc/Hardware/Yun#rebootStability) arises when starting up, or resetting either part.

# Setting up

- Arduino Yun with the [latest firmware](http://arduino.cc/en/Tutorial/YunSysupgrade)
- [Extending the limited disk space](http://arduino.cc/en/Tutorial/ExpandingYunDiskSpace) using a microSD card
- Setting up the MCU side to be usable with Firmata
- Setting up the Linux side
- Setting up the development machine

## Extending the disk space

There is a [sketch provided](https://github.com/Fede85/YunSketches/blob/master/YunDiskSpaceExpander/YunDiskSpaceExpander.ino) to do it all using the MCU. However it's not difficult to do it yourself and you can have more control over the process when doing so.

This is how I did it, based on the sketch above.

Check if there is enough free disk space on the Linux
```bash
# Should be at least 1000. Otherwise do not continue!
df / | awk '/rootfs/ {print $4}'
```

Install tools for partitioning, creating the file systems and for copying conent
```bash
opkg update
opkg install e2fsprogs mkdosfs fdisk rsync
```

Unmount disk before the action
```bash
umount /dev/sda?
rm -rf /mnt/sda?
```

Clean partition table on the microSD
```bash
dd if=/dev/zero of=/dev/sda bs=4096 count=10
```

Partition the microSD
```bash
fdisk /dev/sda
```

This is how my partition table looks like after partitioning
```
Disk /dev/sda: 7742 MB, 7742685184 bytes

   Device Boot      Start         End      Blocks   Id  System
/dev/sda1            2048     7667711     3832832    c  W95 FAT32 (LBA)
/dev/sda2         7667712     8191999      262144   82  Linux swap / Solaris
/dev/sda3         8192000    15122431     3465216   83  Linux
```

Create filesystems
```bash
mkfs.vfat /dev/sda1
mkswap /dev/sda2
mkfs.ext4 /dev/sda3
```

Create standard directory structure on the VFAT partition
```bash
mkdir -p /mnt/sda1
mount /dev/sda1 /mnt/sda1
mkdir -p /mnt/sda1/arduino/www
umount /dev/sda1
rm -rf /mnt/sda1
```

Copy content to the Linux partition and set it up
```bash
mkdir -p /mnt/sda3
mount /dev/sda3 /mnt/sda3
rsync -a --exclude=/mnt/ --exclude=/www/sd /overlay/ /mnt/sda3/
uci -c /mnt/sda3/etc/config/ set fstab.autoswap.anon_swap=1
uci -c /mnt/sda3/etc/config/ commit
umount /dev/sda3
rm -rf /mnt/sda3
```

Configure system to use the newly created disk as overlay
```bash
uci add fstab mount
uci set fstab.@mount[0].target=/overlay
uci set fstab.@mount[0].device=/dev/sda3
uci set fstab.@mount[0].fstype=ext4
uci set fstab.@mount[0].enabled=1
uci set fstab.@mount[0].enabled_fsck=0
uci set fstab.@mount[0].options=rw,sync,noatime,nodiratime
uci commit
```

## Setting up the MCU side

You need to upload the [modified sketch](StandardFirmataForATH0.ino) using the serial line between the two chips provided. I did it using the USB cable and the [Arduino software](http://arduino.cc/en/Main/Software)

The crucial part is in the `setup` function:

```c++
  // 2500 is the bare minimum needed to be able to reboot both linino and leonardo.
  // if reboot fails try increasing this number
  // The more you run on linux the higher this number should be
  delay(7500);
               
  //Serial1.begin(115200); // Set the baud.
  Serial1.begin(57600); // Set the baud to Firmata default.
  
  // Wait for U-boot to finish startup.  Consume all bytes until we are done.
  do {
    while (Serial1.available() > 0) {
      Serial1.read();
    }
    delay(1000);
  } while (Serial1.available() > 0);
  
  Firmata.begin(Serial1);
```

## Setting up the Linux side

The Linux side is configured to use the serial line between the two chips as a serial console. It's a good thing if things go wrong with the Linux. In that case with the appropriate sketch programmed to the MCU you can still access the kernel on the Linux side when booting.

On the other hand we want to use the Firmata protocol over this very same serial line to control the MCU. This two does interfere with each other. So special care must be taken.

One is in the above modification to the `StandardFirmata` sketch. The others are for the Linux part and are listed below.

### Do not ask for launching a console on the serial line

`root@Arduino:~# cat /etc/inittab`

```
::sysinit:/etc/init.d/rcS S boot
::shutdown:/etc/init.d/rcS K shutdown
#ttyATH0::askfirst:/bin/ash --login
```

### Silent kernel debug messages on the serial line

`root@Arduino:~# cat /etc/rc.local`

```bash
# Put your custom commands here that should be executed once
# the system init finished. By default this file does nothing.

wifi-live-or-reset
boot-complete-notify

# Uncomment the following line in order to reset the microntroller
# right after linux becomes ready

#reset-mcu

# Uncomment the following line in order to disable kernel console
# debug messages, thus having a silent and clean serial communication
# with the microcontroller

echo 0 > /proc/sys/kernel/printk

exit 0
```

### Create a wrapper for rebooting, which resets the MCU

`root@Arduino:/mnt/sda1# cat /bin/reboot`

```bash
reset-mcu
/sbin/reboot
```

### Configure the firmata app to be run as a service automatically when powering up the Yun

You can use the inittab file for example: [zzz_firmata_app](zzz_firmata_app)

To enable, run:

`root@Arduino:~# /etc/init.d/zzz_firmata_app enable`

After this the firmata app will run automatically every time the Yun is booted.

*Note* that you can stop and start it again manually as well:

`root@Arduino:~# /etc/init.d/zzz_firmata_app`

```
Syntax: /etc/init.d/zzz_firmata_app [command]

Available commands:
  start Start the service
  stop  Stop the service
  restart Restart the service
  reload  Reload configuration files (or restart if that fails)
  enable  Enable service autostart
  disable Disable service autostart

```

After these modifications, please **reboot** your Yun!

## Setting up the development machine

I assume you are using a Mac or a Linux machine.

*Note* by adding your public key to the Yun can make your life easier.

You can use a simple helper script to upload your firmata app to the Yun.

For example: [upload_firmata_app.sh](upload_firmata_app.sh)

# The workflow

1. Write a firmata app (node.js app using the firmata module) using your favorite editor
2. Run `./upload_firmata_app.sh my_app.js` to upload it to your Yun
3. Enjoy

*Note* that your firmata app will be persistent. eg. Will run automatically when you power up your device.

[1]: http://arduino.cc/en/Guide/ArduinoYun
[2]: https://github.com/arduino/openwrt-yun
[3]: http://firmata.org/wiki/Main_Page
[4]: http://nodejs.org/
