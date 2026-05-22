import type { UserProfile } from "../types/user";

const USERS_API_URL =
    import.meta.env.VITE_USERS_API_URL ??
    "https://users.restockoffice.de";

export async function loadCustomerProfile({
    token,
    userId,
}: {
    token: string;
    userId: string;
}): Promise<UserProfile> {
    const response = await fetch(
        `${USERS_API_URL}/customer?userId=${userId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error("Customer konnte nicht geladen werden");
    }

    return response.json();
}