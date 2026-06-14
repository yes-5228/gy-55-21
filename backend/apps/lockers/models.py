from django.db import models


class LockerZone(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name="分区名称")
    code = models.CharField(max_length=20, unique=True, verbose_name="分区编码")
    is_active = models.BooleanField(default=True, verbose_name="启用状态")
    description = models.TextField(blank=True, verbose_name="描述")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "柜机分区"
        verbose_name_plural = "柜机分区"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def cell_count(self):
        return self.cells.count()

    @property
    def active_cell_count(self):
        return self.cells.exclude(status=LockerCell.Status.MAINTENANCE).count()


class LockerCell(models.Model):
    class Size(models.TextChoices):
        SMALL = "small", "小"
        MEDIUM = "medium", "中"
        LARGE = "large", "大"

    class Status(models.TextChoices):
        EMPTY = "empty", "空闲"
        OCCUPIED = "occupied", "已占用"
        OPEN = "open", "已开门"
        MAINTENANCE = "maintenance", "维护中"

    code = models.CharField(max_length=20, unique=True, verbose_name="柜格编码")
    zone = models.ForeignKey(
        LockerZone,
        on_delete=models.PROTECT,
        related_name="cells",
        verbose_name="所属分区",
        null=True,
        blank=True,
    )
    zone_name = models.CharField(max_length=30, default="A区", verbose_name="分区名称(旧)")
    size = models.CharField(max_length=20, choices=Size.choices, default=Size.MEDIUM, verbose_name="尺寸")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EMPTY, verbose_name="状态")
    temperature = models.DecimalField(max_digits=5, decimal_places=2, default=24, verbose_name="温度")
    last_opened_at = models.DateTimeField(null=True, blank=True, verbose_name="最后开启时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "柜格"
        verbose_name_plural = "柜格"
        ordering = ["zone__code", "code"]

    def __str__(self):
        zone_display = self.zone.code if self.zone else self.zone_name
        return f"{zone_display}-{self.code}"
