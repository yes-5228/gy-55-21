from django.contrib import admin

from .models import LockerCell, LockerZone


@admin.register(LockerZone)
class LockerZoneAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "cell_count", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    readonly_fields = ("created_at", "updated_at")

    def cell_count(self, obj):
        return obj.cells.count()
    cell_count.short_description = "柜格数量"


@admin.register(LockerCell)
class LockerCellAdmin(admin.ModelAdmin):
    list_display = ("code", "zone", "size", "status", "temperature", "updated_at")
    list_filter = ("zone", "size", "status")
    search_fields = ("code",)
