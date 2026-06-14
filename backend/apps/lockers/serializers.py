from rest_framework import serializers

from .models import LockerCell, LockerZone


class LockerZoneSerializer(serializers.ModelSerializer):
    cell_count = serializers.IntegerField(read_only=True)
    active_cell_count = serializers.IntegerField(read_only=True)
    is_active_label = serializers.SerializerMethodField()

    class Meta:
        model = LockerZone
        fields = [
            "id",
            "name",
            "code",
            "is_active",
            "is_active_label",
            "description",
            "cell_count",
            "active_cell_count",
            "created_at",
            "updated_at",
        ]

    def get_is_active_label(self, obj):
        return "启用" if obj.is_active else "停用"


class LockerZoneSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = LockerZone
        fields = ["id", "name", "code", "is_active"]


class LockerCellSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    size_label = serializers.CharField(source="get_size_display", read_only=True)
    zone_info = LockerZoneSummarySerializer(source="zone", read_only=True)
    zone_display = serializers.SerializerMethodField()

    class Meta:
        model = LockerCell
        fields = [
            "id",
            "code",
            "zone",
            "zone_display",
            "zone_info",
            "size",
            "size_label",
            "status",
            "status_label",
            "temperature",
            "last_opened_at",
            "updated_at",
        ]

    def get_zone_display(self, obj):
        if obj.zone:
            return f"{obj.zone.code} - {obj.zone.name}"
        return obj.zone_name


class BatchCreateCellsSerializer(serializers.Serializer):
    zone_id = serializers.IntegerField()
    start_index = serializers.IntegerField(min_value=1, default=1)
    count = serializers.IntegerField(min_value=1, max_value=200)
    size = serializers.ChoiceField(choices=LockerCell.Size.choices, default=LockerCell.Size.MEDIUM)
    prefix = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate_zone_id(self, value):
        if not LockerZone.objects.filter(id=value).exists():
            raise serializers.ValidationError("分区不存在")
        return value


class ToggleCellMaintenanceSerializer(serializers.Serializer):
    is_maintenance = serializers.BooleanField()
