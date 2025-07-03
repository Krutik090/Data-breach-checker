// Open/Close modal functions
function openModal() {
  const searchedEmail = document.getElementById("emailInput").value.trim();
  document.getElementById("contactEmail").value = searchedEmail || "";
  document.getElementById("contactModal").classList.remove("hidden");
}


function closeModal() {
  document.getElementById("contactModal").classList.add("hidden");
}

// Contact form submit handler
document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const message = document.getElementById("message").value.trim();

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });

    const data = await res.json();
    if (data.success) {
      alert("✅ Message submitted successfully.");
      closeModal();
      document.getElementById("contactForm").reset();
    } else {
      alert("❌ Failed to submit. Try again later.");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Server error. Please try again.");
  }
});

// Breach checker with reCAPTCHA

async function searchBreach() {
  const email = document.getElementById("emailInput").value.trim();
  const container = document.getElementById("results-container");
  const spinner = document.getElementById("loading");

  container.innerHTML = "";
  if (!email) return showToast("Please enter a valid email address", true);

  const token = grecaptcha.getResponse();
  if (!token) return showToast("Please complete the CAPTCHA", true);

  spinner.classList.remove("hidden");

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });

    const data = await response.json();

    if (!data.success || data.found === 0 || !data.sources?.length) {
      container.innerHTML = `
        <div class="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg text-center fade-in">
          ✅ <strong>${email}</strong> appears to be <span class="font-semibold">SAFE</span>. No breaches found.
        </div>`;
      return;
    }

    let html = `
      <div class="fade-in">
        <p class="text-lg mb-2 text-gray-700"><strong>Leaks found:</strong> <span class="text-pink-custom font-bold">${data.found}</span></p>
        <p class="mb-4 text-gray-700"><strong>Leaked Fields:</strong> ${data.fields.join(', ')}</p>

        <div class="overflow-x-auto rounded-lg shadow">
          <table class="min-w-full bg-white border border-pink-custom rounded-lg overflow-hidden">
            <thead class="bg-pink-custom text-white">
              <tr>
                <th class="py-3 px-4 text-left">#</th>
                <th class="py-3 px-4 text-left">Source</th>
                <th class="py-3 px-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
    `;

    data.sources.forEach((source, index) => {
      html += `
        <tr class="border-t border-gray-200 hover:bg-gray-50">
          <td class="py-3 px-4">${index + 1}</td>
          <td class="py-3 px-4">${source.name}</td>
          <td class="py-3 px-4">${source.date}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="mt-6 mb-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-4 rounded-lg text-center fade-in">
          ⚠️ If this data belongs to you and you want it removed,
          <button onclick="openModal()" class="underline text-pink-custom font-semibold hover:text-pink-700">Contact Us</button>.
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    showToast("Server error occurred. Try again later.", true);
  } finally {
    grecaptcha.reset();
    spinner.classList.add("hidden");
  }
}
