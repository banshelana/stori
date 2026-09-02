"use client";

import { useState } from "react";
import { MapView, type MapMarker } from "@/components/MapView";
import { Icon } from "@/components/panel/Icon";
import { Modal } from "@/components/panel/Modal";
import { Badge } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserAddress } from "@/lib/auth/types";
import { findCity, findCountry, findProvince, geoName } from "@/lib/data/geo";
import { formatLatLon, isValidLatLon } from "@/lib/map";
import type { MockUser } from "@/lib/data/users";

/** Addresses that actually carry a usable pin. */
export function pinnedAddresses(user: {
  addresses?: UserAddress[];
}): UserAddress[] {
  return (user.addresses ?? []).filter((a) =>
    isValidLatLon({ lat: a.lat, lon: a.lon })
  );
}

export function hasLocation(user: { addresses?: UserAddress[] }): boolean {
  return pinnedAddresses(user).length > 0;
}

export function CustomerLocationModal({
  customer,
  onClose,
}: {
  customer: MockUser;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const addresses = pinnedAddresses(customer);
  // Starts unfocused on purpose. Focusing an address pans the map to it,
  // which would override MapView's fit-to-all and hide every other pin —
  // with addresses in different cities the first view should show the
  // spread, not one street. The Default badge already marks the primary.
  const [focusId, setFocusId] = useState<string | null>(null);

  const markers: MapMarker[] = addresses.map((a) => ({
    id: a.id,
    lat: a.lat as number,
    lon: a.lon as number,
    label: cityLine(a),
  }));

  function cityLine(address: UserAddress): string {
    return [
      findCountry(address.countryId),
      findProvince(address.provinceId),
      findCity(address.cityId),
    ]
      .map((entry) => (entry ? geoName(entry.name, locale) : "—"))
      .join(" › ");
  }

  function streetLine(address: UserAddress): string {
    return [
      address.street && `${t("address.street")} ${address.street}`,
      address.alley && `${t("address.alley")} ${address.alley}`,
      address.buildingNo && `${t("address.buildingNo")} ${address.buildingNo}`,
      address.floor && `${t("address.floor")} ${address.floor}`,
      address.unit && `${t("address.unit")} ${address.unit}`,
    ]
      .filter(Boolean)
      .join(locale === "fa" ? "، " : ", ");
  }

  return (
    <Modal
      open
      size="lg"
      title={`${t("admin.customerLocation")} — ${customer.firstName} ${customer.lastName}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.back")}
        </button>
      }
    >
      <div className="space-y-4">
        <MapView markers={markers} focusId={focusId} />

        {/* One entry per pinned address. With several, clicking one pans
            the map to it — the map alone cannot say which pin is which. */}
        <ul className="space-y-2">
          {addresses.map((address) => {
            const active = address.id === focusId;
            return (
              <li key={address.id}>
                <button
                  type="button"
                  onClick={() => setFocusId(address.id)}
                  aria-pressed={active}
                  className={`w-full rounded-xl border p-3 text-start transition-colors ${
                    active
                      ? "border-indigo-300 bg-indigo-50/60"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <Icon
                          name="pin"
                          className="h-4 w-4 shrink-0 text-indigo-500"
                        />
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {cityLine(address)}
                        </span>
                      </span>
                      {streetLine(address) && (
                        <span className="mt-1 block text-sm text-slate-600">
                          {streetLine(address)}
                        </span>
                      )}
                      <span className="force-ltr mt-1 block text-xs text-slate-400">
                        {formatLatLon({
                          lat: address.lat as number,
                          lon: address.lon as number,
                        })}
                      </span>
                    </span>
                    {address.isDefault && (
                      <Badge tone="success">{t("address.defaultLabel")}</Badge>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
